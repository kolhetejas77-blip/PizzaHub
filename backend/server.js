const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const Razorpay = require("razorpay");
const crypto = require("crypto");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);

// =====================================================
// PIZZA HUB EMAIL SENDER
// =====================================================
// This is intentionally fixed here so the old
// specialyout10@gmail.com value cannot be used.
// =====================================================

const BREVO_SENDER_NAME = "PizzaHub";
const BREVO_SENDER_EMAIL = "kolhetejas47@gmail.com";

async function startServer() {
  try {
    // =========================
    // CONNECT MONGODB
    // =========================

    await client.connect();

    console.log("✅ MongoDB connected successfully!");

    const db = client.db("pizza_delivery");

    const pizzasCollection = db.collection("pizzas");
    const usersCollection = db.collection("users");
    const ordersCollection = db.collection("orders");

    // =========================
    // RAZORPAY CONFIGURATION
    // =========================

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // =========================
    // AUTH MIDDLEWARE
    // =========================

    const requireAuth = (req, res, next) => {
      try {
        const header = req.headers.authorization || "";

        const token = header.startsWith("Bearer ")
          ? header.slice(7)
          : null;

        if (!token) {
          return res.status(401).json({
            message: "Please sign in before checkout.",
          });
        }

        req.user = jwt.verify(
          token,
          process.env.JWT_SECRET
        );

        next();
      } catch (error) {
        return res.status(401).json({
          message:
            "Your login session has expired. Please sign in again.",
        });
      }
    };

    // =========================
    // BREVO EMAIL CONFIGURATION
    // =========================

    const transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: Number(process.env.BREVO_SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_LOGIN,
        pass: process.env.BREVO_SMTP_KEY,
      },
    });

    // Check SMTP connection
    try {
      await transporter.verify();

      console.log("✅ Brevo SMTP connection successful.");
      console.log(
        `📧 PizzaHub sender: ${BREVO_SENDER_EMAIL}`
      );
    } catch (emailConnectionError) {
      console.error(
        "⚠️ Brevo SMTP connection failed:",
        emailConnectionError.message
      );
    }

    // =========================
    // HOME
    // =========================

    app.get("/", (req, res) => {
      res.json({
        message: "🍕 Pizza Delivery API is running!",
        database: "MongoDB connected",
      });
    });

    // =========================
    // GET PIZZAS
    // =========================

    app.get("/api/pizzas", async (req, res) => {
      try {
        const pizzas = await pizzasCollection
          .find()
          .toArray();

        res.json(pizzas);
      } catch (error) {
        console.error("Pizza fetch error:", error);

        res.status(500).json({
          message: "Error fetching pizzas",
          error: error.message,
        });
      }
    });

    // =========================
    // REGISTER USER
    // =========================

    app.post("/api/auth/register", async (req, res) => {
      try {
        const {
          name,
          email,
          password,
          confirmPassword,
        } = req.body;

        if (
          !name ||
          !email ||
          !password ||
          !confirmPassword
        ) {
          return res.status(400).json({
            message:
              "Name, email, password and confirm password are required.",
          });
        }

        if (password !== confirmPassword) {
          return res.status(400).json({
            message: "Passwords do not match.",
          });
        }

        if (password.length < 6) {
          return res.status(400).json({
            message:
              "Password must be at least 6 characters.",
          });
        }

        const normalizedEmail = email
          .trim()
          .toLowerCase();

        const normalizedName = name.trim();

        if (!normalizedName) {
          return res.status(400).json({
            message: "Name cannot be empty.",
          });
        }

        // Check existing user
        const existingUser =
          await usersCollection.findOne({
            email: normalizedEmail,
          });

        if (existingUser) {
          return res.status(409).json({
            message:
              "An account with this email already exists.",
          });
        }

        // Hash password
        const hashedPassword =
          await bcrypt.hash(password, 12);

        // Generate OTP
        const otp = crypto
          .randomInt(100000, 1000000)
          .toString();

        // Hash OTP
        const hashedOtp =
          await bcrypt.hash(otp, 10);

        // OTP expires after 10 minutes
        const otpExpires = new Date(
          Date.now() + 10 * 60 * 1000
        );

        const user = {
          name: normalizedName,
          email: normalizedEmail,
          password: hashedPassword,

          isVerified: false,

          otp: hashedOtp,
          otpExpires: otpExpires,

          otpAttempts: 0,
          lastOtpSentAt: new Date(),

          createdAt: new Date(),
        };

        await usersCollection.insertOne(user);

        // =========================
        // SEND OTP EMAIL
        // =========================

        console.log(
          `📧 Sending OTP from ${BREVO_SENDER_EMAIL} to ${normalizedEmail}`
        );

        await transporter.sendMail({
          from: `"${BREVO_SENDER_NAME}" <${BREVO_SENDER_EMAIL}>`,

          to: normalizedEmail,

          subject:
            "🍕 Your PizzaHub Verification OTP",

          html: `
            <div style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: auto;
              padding: 30px;
              background: #fff7f0;
            ">

              <div style="
                background: white;
                padding: 30px;
                border-radius: 16px;
                text-align: center;
              ">

                <h1 style="color: #ff5a1f;">
                  🍕 PizzaHub
                </h1>

                <h2>Verify Your Email</h2>

                <p>
                  Hello ${normalizedName},
                </p>

                <p>
                  Thank you for creating your PizzaHub account.
                  Use the OTP below to verify your email address.
                </p>

                <div style="
                  margin: 30px 0;
                  padding: 20px;
                  background: #fff0e8;
                  border-radius: 12px;
                ">

                  <div style="
                    font-size: 36px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    color: #ff5a1f;
                  ">
                    ${otp}
                  </div>

                </div>

                <p>
                  This OTP will expire in
                  <strong>10 minutes</strong>.
                </p>

                <p style="color: #777;">
                  If you did not create a PizzaHub account,
                  you can safely ignore this email.
                </p>

                <p>
                  — PizzaHub Team 🍕
                </p>

              </div>
            </div>
          `,
        });

        console.log(
          `📧 OTP sent successfully to ${normalizedEmail}`
        );

        res.status(201).json({
          message:
            "Registration successful. A verification OTP has been sent to your email.",
        });
      } catch (error) {
        console.error(
          "Registration error:",
          error
        );

        res.status(500).json({
          message: "Unable to register user.",
          error: error.message,
        });
      }
    });

    // =========================
    // VERIFY OTP
    // =========================

    app.post(
      "/api/auth/verify-otp",
      async (req, res) => {
        try {
          const { email, otp } = req.body;

          if (!email || !otp) {
            return res.status(400).json({
              message:
                "Email and OTP are required.",
            });
          }

          const normalizedEmail = email
            .trim()
            .toLowerCase();

          const user =
            await usersCollection.findOne({
              email: normalizedEmail,
            });

          if (!user) {
            return res.status(404).json({
              message:
                "User account not found.",
            });
          }

          if (user.isVerified) {
            return res.status(400).json({
              message:
                "This email is already verified.",
            });
          }

          // OTP expiry
          if (
            !user.otpExpires ||
            user.otpExpires < new Date()
          ) {
            return res.status(400).json({
              message:
                "OTP has expired. Please request a new OTP.",
            });
          }

          // OTP attempts
          if ((user.otpAttempts || 0) >= 5) {
            return res.status(429).json({
              message:
                "Too many incorrect OTP attempts. Please request a new OTP.",
            });
          }

          // Compare OTP
          const otpMatch =
            await bcrypt.compare(
              otp.toString(),
              user.otp
            );

          if (!otpMatch) {
            await usersCollection.updateOne(
              {
                _id: user._id,
              },
              {
                $inc: {
                  otpAttempts: 1,
                },
              }
            );

            return res.status(400).json({
              message: "Incorrect OTP.",
            });
          }

          // Verify user
          await usersCollection.updateOne(
            {
              _id: user._id,
            },
            {
              $set: {
                isVerified: true,
              },

              $unset: {
                otp: "",
                otpExpires: "",
                otpAttempts: "",
                lastOtpSentAt: "",
              },
            }
          );

          res.json({
            message:
              "Email verified successfully. You can now log in.",
          });
        } catch (error) {
          console.error(
            "OTP verification error:",
            error
          );

          res.status(500).json({
            message:
              "Unable to verify OTP.",
            error: error.message,
          });
        }
      }
    );

    // =========================
    // RESEND OTP
    // =========================

    app.post(
      "/api/auth/resend-otp",
      async (req, res) => {
        try {
          const { email } = req.body;

          if (!email) {
            return res.status(400).json({
              message: "Email is required.",
            });
          }

          const normalizedEmail = email
            .trim()
            .toLowerCase();

          const user =
            await usersCollection.findOne({
              email: normalizedEmail,
            });

          if (!user) {
            return res.status(404).json({
              message:
                "User account not found.",
            });
          }

          if (user.isVerified) {
            return res.status(400).json({
              message:
                "This email is already verified.",
            });
          }

          // Prevent OTP spam
          if (
            user.lastOtpSentAt &&
            Date.now() -
              new Date(
                user.lastOtpSentAt
              ).getTime() <
              60 * 1000
          ) {
            return res.status(429).json({
              message:
                "Please wait 60 seconds before requesting another OTP.",
            });
          }

          // Generate OTP
          const otp = crypto
            .randomInt(100000, 1000000)
            .toString();

          const hashedOtp =
            await bcrypt.hash(otp, 10);

          const otpExpires = new Date(
            Date.now() + 10 * 60 * 1000
          );

          await usersCollection.updateOne(
            {
              _id: user._id,
            },
            {
              $set: {
                otp: hashedOtp,
                otpExpires,
                otpAttempts: 0,
                lastOtpSentAt: new Date(),
              },
            }
          );

          // =========================
          // SEND NEW OTP
          // =========================

          console.log(
            `📧 Sending new OTP from ${BREVO_SENDER_EMAIL} to ${normalizedEmail}`
          );

          await transporter.sendMail({
            from: `"${BREVO_SENDER_NAME}" <${BREVO_SENDER_EMAIL}>`,

            to: normalizedEmail,

            subject:
              "🍕 Your New PizzaHub OTP",

            html: `
              <div style="
                font-family: Arial, sans-serif;
                max-width: 600px;
                margin: auto;
                padding: 30px;
                background: #fff7f0;
              ">

                <div style="
                  background: white;
                  padding: 30px;
                  border-radius: 16px;
                  text-align: center;
                ">

                  <h1 style="color:#ff5a1f;">
                    🍕 PizzaHub
                  </h1>

                  <h2>
                    Your New Verification OTP
                  </h2>

                  <div style="
                    margin: 30px 0;
                    padding: 20px;
                    background: #fff0e8;
                    border-radius: 12px;
                  ">

                    <div style="
                      font-size: 36px;
                      font-weight: bold;
                      letter-spacing: 8px;
                      color: #ff5a1f;
                    ">
                      ${otp}
                    </div>

                  </div>

                  <p>
                    This OTP will expire in
                    <strong>10 minutes</strong>.
                  </p>

                  <p>
                    — PizzaHub Team 🍕
                  </p>

                </div>
              </div>
            `,
          });

          console.log(
            `📧 New OTP sent successfully to ${normalizedEmail}`
          );

          res.json({
            message:
              "A new OTP has been sent to your email.",
          });
        } catch (error) {
          console.error(
            "Resend OTP error:",
            error
          );

          res.status(500).json({
            message:
              "Unable to resend OTP.",
            error: error.message,
          });
        }
      }
    );

    // =========================
    // LOGIN
    // =========================

    app.post(
      "/api/auth/login",
      async (req, res) => {
        try {
          const {
            email,
            password,
          } = req.body;

          if (!email || !password) {
            return res.status(400).json({
              message:
                "Email and password are required.",
            });
          }

          const normalizedEmail = email
            .trim()
            .toLowerCase();

          const user =
            await usersCollection.findOne({
              email: normalizedEmail,
            });

          if (!user) {
            return res.status(401).json({
              message:
                "Invalid email or password.",
            });
          }

          const passwordMatch =
            await bcrypt.compare(
              password,
              user.password
            );

          if (!passwordMatch) {
            return res.status(401).json({
              message:
                "Invalid email or password.",
            });
          }

          if (!user.isVerified) {
            return res.status(403).json({
              message:
                "Please verify your email with the OTP before logging in.",
            });
          }

          const token = jwt.sign(
            {
              userId:
                user._id.toString(),

              email:
                user.email,

              name:
                user.name,
            },

            process.env.JWT_SECRET,

            {
              expiresIn: "7d",
            }
          );

          res.json({
            message:
              "Login successful.",

            token,

            user: {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
            },
          });
        } catch (error) {
          console.error(
            "Login error:",
            error
          );

          res.status(500).json({
            message:
              "Unable to login.",
            error: error.message,
          });
        }
      }
    );

    // =========================
    // CREATE RAZORPAY ORDER
    // =========================

    app.post(
      "/api/payments/create-order",
      requireAuth,
      async (req, res) => {
        try {
          if (
            !process.env.RAZORPAY_KEY_ID ||
            !process.env.RAZORPAY_KEY_SECRET
          ) {
            return res.status(500).json({
              message:
                "Razorpay is not configured on the server.",
            });
          }

          const {
            items,
          } = req.body;

          if (
            !Array.isArray(items) ||
            items.length === 0
          ) {
            return res.status(400).json({
              message: "Cart is empty.",
            });
          }

          // =========================
          // CLEAN CART
          // =========================
          // EVERY PIZZA = ₹2
          // DELIVERY = FREE
          // =========================

          const cleanItems = items.map(
            (item) => ({
              id: String(
                item._id ||
                  item.id ||
                  ""
              ),

              name: String(
                item.name ||
                  "Pizza"
              ),

              // Force every pizza price to ₹2
              price: 2,

              quantity: Math.max(
                1,
                Number(
                  item.quantity
                ) || 1
              ),
            })
          );

          // =========================
          // CALCULATE SUBTOTAL
          // =========================

          const calculatedSubtotal =
            cleanItems.reduce(
              (sum, item) =>
                sum +
                item.price *
                  item.quantity,
              0
            );

          // =========================
          // DELIVERY CHARGE
          // =========================
          // DELIVERY IS ALWAYS FREE

          const calculatedDeliveryFee = 0;

          // =========================
          // FINAL TOTAL
          // =========================

          const calculatedTotal =
            calculatedSubtotal +
            calculatedDeliveryFee;

          if (
            !Number.isFinite(
              calculatedTotal
            ) ||
            calculatedTotal <= 0
          ) {
            return res.status(400).json({
              message:
                "Invalid order amount.",
            });
          }

          // =========================
          // CREATE RAZORPAY ORDER
          // =========================

          const receipt =
            `PH${Date.now()}`.slice(
              0,
              40
            );

          const razorpayOrder =
            await razorpay.orders.create(
              {
                amount:
                  Math.round(
                    calculatedTotal *
                      100
                  ),

                currency: "INR",

                receipt,

                notes: {
                  email:
                    req.user.email,

                  app: "PizzaHub",
                },
              }
            );

          // =========================
          // SAVE LOCAL ORDER
          // =========================

          const localOrder = {
            userId:
              req.user.userId,

            email:
              req.user.email,

            items: cleanItems,

            subtotal:
              calculatedSubtotal,

            deliveryFee:
              calculatedDeliveryFee,

            total:
              calculatedTotal,

            currency: "INR",

            status: "created",

            paymentStatus:
              "pending",

            razorpayOrderId:
              razorpayOrder.id,

            createdAt:
              new Date(),
          };

          const saved =
            await ordersCollection.insertOne(
              localOrder
            );

          // =========================
          // SEND RESPONSE
          // =========================

          res.json({
            keyId:
              process.env
                .RAZORPAY_KEY_ID,

            orderId:
              razorpayOrder.id,

            amount:
              razorpayOrder.amount,

            currency:
              razorpayOrder.currency,

            localOrderId:
              saved.insertedId.toString(),

            customer: {
              name:
                req.user.name ||
                "PizzaHub Customer",

              email:
                req.user.email,
            },
          });
        } catch (error) {
          console.error(
            "Create Razorpay order error:",
            error
          );

          res.status(500).json({
            message:
              "Unable to start payment.",

            error:
              error.message,
          });
        }
      }
    );

    // =========================
    // VERIFY PAYMENT
    // + SEND BILL EMAIL
    // =========================

    app.post(
      "/api/payments/verify",
      requireAuth,
      async (req, res) => {
        try {
          const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
          } = req.body;

          // =========================
          // CHECK PAYMENT DATA
          // =========================

          if (
            !razorpay_payment_id ||
            !razorpay_order_id ||
            !razorpay_signature
          ) {
            return res.status(400).json({
              message:
                "Payment verification details are incomplete.",
            });
          }

          // =========================
          // FIND ORDER
          // =========================

          const order =
            await ordersCollection.findOne(
              {
                razorpayOrderId:
                  razorpay_order_id,

                email:
                  req.user.email,
              }
            );

          if (!order) {
            return res.status(404).json({
              message:
                "Order not found.",
            });
          }

          // =========================
          // VERIFY RAZORPAY SIGNATURE
          // =========================

          const expectedSignature =
            crypto
              .createHmac(
                "sha256",
                process.env
                  .RAZORPAY_KEY_SECRET
              )
              .update(
                `${order.razorpayOrderId}|${razorpay_payment_id}`
              )
              .digest("hex");

          if (
            expectedSignature !==
            razorpay_signature
          ) {
            return res.status(400).json({
              message:
                "Payment signature verification failed.",
            });
          }

          // =========================
          // MARK PAYMENT PAID
          // =========================

          await ordersCollection.updateOne(
            {
              _id: order._id,
            },

            {
              $set: {
                status: "paid",

                paymentStatus:
                  "paid",

                razorpayPaymentId:
                  razorpay_payment_id,

                razorpaySignature:
                  razorpay_signature,

                paidAt:
                  new Date(),
              },
            }
          );

          // =========================
          // CREATE BILL ROWS
          // =========================

          const billRows =
            order.items
              .map(
                (item) => `
                  <tr>
                    <td style="
                      padding:10px;
                      border-bottom:1px solid #eee;
                    ">
                      ${item.name}
                    </td>

                    <td style="
                      padding:10px;
                      text-align:center;
                      border-bottom:1px solid #eee;
                    ">
                      ${item.quantity}
                    </td>

                    <td style="
                      padding:10px;
                      text-align:right;
                      border-bottom:1px solid #eee;
                    ">
                      ₹${(
                        item.price *
                        item.quantity
                      ).toFixed(2)}
                    </td>
                  </tr>
                `
              )
              .join("");

          // =========================
          // SEND BILL EMAIL
          // =========================

          try {
            console.log(
              `📧 Sending BILL from ${BREVO_SENDER_EMAIL} to ${order.email}`
            );

            const mailInfo =
              await transporter.sendMail({
                from: `"${BREVO_SENDER_NAME}" <${BREVO_SENDER_EMAIL}>`,

                to: order.email,

                subject:
                  `🍕 PizzaHub Payment Receipt - ${order.razorpayOrderId}`,

                html: `
                  <div style="
                    font-family:Arial,sans-serif;
                    background:#fff7f0;
                    padding:30px;
                  ">

                    <div style="
                      max-width:650px;
                      margin:auto;
                      background:white;
                      padding:30px;
                      border-radius:18px;
                    ">

                      <h1 style="
                        color:#ff5a1f;
                        margin-top:0;
                      ">
                        🍕 PizzaHub
                      </h1>

                      <h2>
                        Payment successful 🎉
                      </h2>

                      <p>
                        Thank you for your order.
                        Your payment has been verified successfully.
                      </p>

                      <p>
                        <strong>
                          Customer:
                        </strong>
                        ${req.user.name || "PizzaHub Customer"}
                      </p>

                      <p>
                        <strong>
                          Email:
                        </strong>
                        ${order.email}
                      </p>

                      <p>
                        <strong>
                          Order ID:
                        </strong>
                        ${order.razorpayOrderId}
                      </p>

                      <p>
                        <strong>
                          Payment ID:
                        </strong>
                        ${razorpay_payment_id}
                      </p>

                      <p>
                        <strong>
                          Date:
                        </strong>
                        ${new Date().toLocaleString(
                          "en-IN"
                        )}
                      </p>

                      <table style="
                        width:100%;
                        border-collapse:collapse;
                        margin-top:20px;
                      ">

                        <thead>
                          <tr>

                            <th style="
                              text-align:left;
                              padding:10px;
                              border-bottom:2px solid #ff5a1f;
                            ">
                              Item
                            </th>

                            <th style="
                              text-align:center;
                              padding:10px;
                              border-bottom:2px solid #ff5a1f;
                            ">
                              Qty
                            </th>

                            <th style="
                              text-align:right;
                              padding:10px;
                              border-bottom:2px solid #ff5a1f;
                            ">
                              Amount
                            </th>

                          </tr>
                        </thead>

                        <tbody>
                          ${billRows}
                        </tbody>

                      </table>

                      <div style="
                        margin-top:20px;
                        text-align:right;
                      ">

                        <p>
                          Subtotal:
                          <strong>
                            ₹${order.subtotal.toFixed(2)}
                          </strong>
                        </p>

                        <p>
                          Delivery:
                          <strong>
                            FREE
                          </strong>
                        </p>

                        <h2 style="
                          color:#ff5a1f;
                        ">
                          Total Paid:
                          ₹${order.total.toFixed(2)}
                        </h2>

                      </div>

                      <div style="
                        margin-top:30px;
                        padding:15px;
                        background:#fff7f0;
                        border-radius:10px;
                        text-align:center;
                      ">
                        <p style="
                          margin:0;
                          color:#555;
                        ">
                          Payment Status:
                          <strong style="color:green;">
                            PAID
                          </strong>
                        </p>
                      </div>

                      <p style="
                        color:#777;
                        margin-bottom:0;
                        margin-top:25px;
                      ">
                        Thank you for choosing
                        PizzaHub. 🍕
                      </p>

                    </div>
                  </div>
                `,
              });

            console.log(
              "📧 Bill email sent successfully."
            );

            console.log(
              "📨 SMTP envelope:",
              mailInfo.envelope
            );

            console.log(
              "📨 Message ID:",
              mailInfo.messageId
            );

          } catch (emailError) {
            console.error(
              "⚠️ Payment succeeded but bill email failed:"
            );

            console.error(
              emailError
            );
          }

          // =========================
          // SUCCESS RESPONSE
          // =========================

          res.json({
            message:
              "Payment verified successfully. Bill processed.",

            orderId:
              order.razorpayOrderId,

            paymentId:
              razorpay_payment_id,

            total:
              order.total,
          });
        } catch (error) {
          console.error(
            "Payment verification error:",
            error
          );

          res.status(500).json({
            message:
              "Payment was received, but confirmation could not be completed automatically. Please check your email and dashboard.",

            error:
              error.message,
          });
        }
      }
    );

    // =========================
    // 404 HANDLER
    // =========================

    app.use((req, res) => {
      res.status(404).json({
        message:
          "API route not found.",
      });
    });

    // =========================
    // START SERVER
    // =========================

    app.listen(PORT, () => {
      console.log(
        `🚀 Backend server running on http://localhost:${PORT}`
      );
    });

  } catch (error) {
    console.error(
      "❌ MongoDB connection failed:"
    );

    console.error(
      error.message
    );
  }
}

startServer();