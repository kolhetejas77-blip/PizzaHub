import React, { useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

const pizzas = [
  {
    id: 1,
    name: "Margherita",
    category: "Veg",
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    name: "Farmhouse",
    category: "Veg",
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 3,
    name: "Pepperoni",
    category: "Non-Veg",
    image:
      "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 4,
    name: "Cheese Burst",
    category: "Veg",
    image:
      "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 5,
    name: "Paneer Tikka",
    category: "Veg",
    image:
      "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 6,
    name: "Chicken Supreme",
    category: "Non-Veg",
    image:
      "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80",
  },
];

function App() {
  /* =========================
     AUTH STATE
  ========================= */

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const [authMode, setAuthMode] = useState("login");

  const [authStep, setAuthStep] = useState("form");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [currentUser, setCurrentUser] = useState(null);

  /* =========================
     APP STATE
  ========================= */

  const [showCart, setShowCart] = useState(false);
  const [cart, setCart] = useState([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);

  /* =========================
     TOAST
  ========================= */

  const showToast = (message) => {
    setToast(message);

    setTimeout(() => {
      setToast("");
    }, 3000);
  };

    const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  /* =========================
     OPEN LOGIN
  ========================= */

  const openLogin = () => {
    setAuthMode("login");
    setAuthStep("form");

    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setOtp("");

    setShowAuth(true);
  };

  /* =========================
     OPEN REGISTER
  ========================= */

  const openRegister = () => {
    setAuthMode("register");
    setAuthStep("form");

    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setOtp("");

    setShowAuth(true);
  };

  /* =========================
     REGISTER
  ========================= */

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      showToast("Please enter your email.");
      return;
    }

    if (!password) {
      showToast("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      showToast("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed."
        );
      }

      showToast("OTP sent to your email 📧");

      setAuthStep("otp");
    } catch (error) {
      console.error(error);

      showToast(
        error.message ||
          "Unable to create account."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     VERIFY OTP
  ========================= */

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      showToast("Please enter the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "OTP verification failed."
        );
      }

      showToast(
        "Email verified successfully! 🎉"
      );

      setAuthMode("login");
      setAuthStep("form");

      setOtp("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        showToast("You can now login to PizzaHub.");
      }, 1000);
    } catch (error) {
      console.error(error);

      showToast(
        error.message ||
          "Invalid or expired OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     RESEND OTP
  ========================= */

  const resendOtp = async () => {
    if (!email) {
      showToast("Email address is missing.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/resend-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to resend OTP."
        );
      }

      setOtp("");

      showToast("New OTP sent to your email 📧");
    } catch (error) {
      console.error(error);

      showToast(
        error.message ||
          "Unable to resend OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     LOGIN
  ========================= */

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      showToast(
        "Please enter email and password."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed."
        );
      }

      /* SAVE TOKEN */

      localStorage.setItem(
        "pizzaHubToken",
        data.token
      );

      localStorage.setItem(
        "pizzaHubUser",
        JSON.stringify(data.user)
      );

      setCurrentUser(data.user);

      setIsLoggedIn(true);
      setShowAuth(false);

      showToast(
        `Welcome ${data.user.name}! 🍕`
      );
    } catch (error) {
      console.error(error);

      showToast(
        error.message ||
          "Unable to login."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     LOGOUT
  ========================= */

  const logout = () => {
    localStorage.removeItem(
      "pizzaHubToken"
    );

    localStorage.removeItem(
      "pizzaHubUser"
    );

    setIsLoggedIn(false);
    setCurrentUser(null);
    setCart([]);

    showToast("Logged out successfully.");
  };

  /* =========================
     ADD TO CART
  ========================= */

  const addToCart = (pizza) => {
    if (!isLoggedIn) {
      showToast(
        "Please create an account or login first 🔐"
      );

      openLogin();

      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.id === pizza.id
      );

      if (existing) {
        return currentCart.map((item) =>
          item.id === pizza.id
            ? {
                ...item,
                quantity:
                  item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...pizza,
          price: 2,
          quantity: 1,
        },
      ];
    });

    showToast(
      `${pizza.name} added to cart 🍕`
    );
  };

  /* =========================
     QUANTITY
  ========================= */

  const increaseQuantity = (id) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity:
                item.quantity + 1,
            }
          : item
      )
    );
  };

  const decreaseQuantity = (id) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity:
                  item.quantity - 1,
              }
            : item
        )
        .filter(
          (item) => item.quantity > 0
        )
    );
  };

  const removeFromCart = (id) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.id !== id
      )
    );
  };

 const handlePayment = async () => {
  if (!isLoggedIn) {
    showToast("Please login before making payment 🔐");
    openLogin();
    return;
  }

  if (cart.length === 0) {
    showToast("Your cart is empty.");
    return;
  }

  const token = localStorage.getItem("pizzaHubToken");

  if (!token) {
    showToast("Your login session has expired.");
    openLogin();
    return;
  }

  try {
    setLoading(true);

    // Load Razorpay Checkout
    const razorpayLoaded = await loadRazorpay();

    if (!razorpayLoaded) {
      throw new Error(
        "Unable to load Razorpay. Please check your internet connection."
      );
    }

    // Create Razorpay order from backend
    const orderResponse = await fetch(
      `${API_URL}/api/payments/create-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            id: item.id,
            name: item.name,
            price: 2,
            quantity: item.quantity,
          })),
        }),
      }
    );

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      throw new Error(
        orderData.message ||
          "Unable to create payment order."
      );
    }

    // Razorpay checkout settings
    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency || "INR",

      name: "PizzaHub",
      description: "PizzaHub Pizza Order",

      order_id: orderData.orderId,

      prefill: {
        name:
          orderData.customer?.name ||
          currentUser?.name ||
          "",

        email:
          orderData.customer?.email ||
          currentUser?.email ||
          "",
      },

      theme: {
        color: "#f4511e",
      },

      handler: async function (paymentResponse) {
        try {
          setLoading(true);

          // Verify payment with backend
          const verifyResponse = await fetch(
            `${API_URL}/api/payments/verify`,
            {
              method: "POST",

              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },

              body: JSON.stringify({
                razorpay_payment_id:
                  paymentResponse.razorpay_payment_id,

                razorpay_order_id:
                  paymentResponse.razorpay_order_id,

                razorpay_signature:
                  paymentResponse.razorpay_signature,
              }),
            }
          );

          const verifyData =
            await verifyResponse.json();

          if (!verifyResponse.ok) {
            throw new Error(
              verifyData.message ||
                "Payment verification failed."
            );
          }

          // Payment successful
          setCart([]);
          setShowCart(false);

          showToast(
            "Payment successful! 🎉 Bill sent to your email 📧"
          );
        } catch (error) {
          console.error(
            "Payment verification error:",
            error
          );

          showToast(
            error.message ||
              "Payment verification failed."
          );
        } finally {
          setLoading(false);
        }
      },

      modal: {
        ondismiss: function () {
          setLoading(false);

          showToast(
            "Payment cancelled."
          );
        },
      },
    };

    // Open Razorpay
    const razorpay =
      new window.Razorpay(options);

    // Payment failure
    razorpay.on(
      "payment.failed",
      function (response) {
        console.error(
          "Razorpay payment failed:",
          response
        );

        setLoading(false);

        showToast(
          response.error?.description ||
            "Payment failed. Please try again."
        );
      }
    );

    razorpay.open();

    setLoading(false);
  } catch (error) {
    console.error(
      "Payment error:",
      error
    );

    setLoading(false);

    showToast(
      error.message ||
        "Unable to start payment."
    );
  }
};

  /* =========================
     FILTER
  ========================= */

  const filteredPizzas =
    pizzas.filter((pizza) => {
      const matchesSearch =
        pizza.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesCategory =
        category === "All" ||
        pizza.category === category;

      return (
        matchesSearch &&
        matchesCategory
      );
    });

  /* =========================
     CART TOTAL
  ========================= */

  const totalItems = cart.reduce(
    (total, item) =>
      total + item.quantity,
    0
  );

  const subtotal = cart.reduce(
    (total, item) =>
      total +
      item.price *
        item.quantity,
    0
  );

  const delivery = 0;

  const total =
    subtotal + delivery;

  /* =========================
     UI
  ========================= */

  return (
    <div className="app">

      {/* =========================
          NAVBAR
      ========================= */}

      <header className="navbar">

        <div className="logo">
          🍕 Pizza<span>Hub</span>
        </div>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#menu">Menu</a>
          <a href="#reviews">
            Reviews
          </a>
        </nav>

        <div className="nav-actions">

          {isLoggedIn ? (
            <>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#555",
                }}
              >
                Hi,{" "}
                {currentUser?.name ||
                  "User"}
              </span>

              <button
                className="logout-btn"
                onClick={logout}
              >
                Logout
              </button>
            </>
          ) : (
            <button
              className="login-btn"
              onClick={openLogin}
            >
              Login
            </button>
          )}

          <button
            className="cart-btn"
            onClick={() =>
              setShowCart(true)
            }
          >
            🛒 Cart

            {totalItems > 0 && (
              <span className="cart-count">
                {totalItems}
              </span>
            )}
          </button>

        </div>
      </header>

      {/* =========================
          HERO
      ========================= */}

      <section
        className="hero"
        id="home"
      >
        <div className="hero-content">

          <div className="hero-text">

            <span className="hero-badge">
              🔥 Special Offer
            </span>

            <h1>
              Delicious Pizza
              <br />
              <span>
                For Just ₹2
              </span>
            </h1>

            <p>
              Fresh ingredients,
              delicious flavors and
              FREE delivery straight
              to your door.
            </p>

            <div className="hero-buttons">

              <a
                href="#menu"
                className="primary-btn"
              >
                Order Now 🍕
              </a>

              <span className="free-delivery">
                🚚 FREE DELIVERY
              </span>

            </div>

          </div>

          <div className="hero-image">

            <img
              src="https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1000&q=80"
              alt="Pizza"
            />

          </div>

        </div>
      </section>

      {/* =========================
          MENU
      ========================= */}

      <section
        className="menu-section"
        id="menu"
      >

        <div className="section-heading">

          <span>
            OUR MENU
          </span>

          <h2>
            Choose Your Favorite Pizza
          </h2>

          <p>
            Every pizza is only ₹2 +
            FREE delivery
          </p>

        </div>

        <div className="filters">

          <div className="search-box">

            🔍

            <input
              type="text"
              placeholder="Search pizza..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />

          </div>

          <div className="category-buttons">

            {[
              "All",
              "Veg",
              "Non-Veg",
            ].map((item) => (

              <button
                key={item}
                className={
                  category === item
                    ? "active-category"
                    : ""
                }
                onClick={() =>
                  setCategory(item)
                }
              >
                {item}
              </button>

            ))}

          </div>

        </div>

        <div className="pizza-grid">

          {filteredPizzas.map(
            (pizza) => (

              <div
                className="pizza-card"
                key={pizza.id}
              >

                <div className="pizza-image-wrapper">

                  <img
                    src={pizza.image}
                    alt={pizza.name}
                  />

                  <span
                    className={
                      pizza.category ===
                      "Veg"
                        ? "veg-badge"
                        : "nonveg-badge"
                    }
                  >
                    {pizza.category}
                  </span>

                </div>

                <div className="pizza-info">

                  <h3>
                    {pizza.name}
                  </h3>

                  <p>
                    Freshly prepared
                    with delicious
                    ingredients.
                  </p>

                  <div className="pizza-bottom">

                    <div className="pizza-price">
                      ₹2
                    </div>

                    <button
                      className="add-cart-button"
                      onClick={() =>
                        addToCart(pizza)
                      }
                    >
                      + Add to Cart
                    </button>

                  </div>

                </div>

              </div>

            )
          )}

        </div>

      </section>

      {/* =========================
          REVIEWS
      ========================= */}

      <section
        className="reviews-section"
        id="reviews"
      >

        <div className="section-heading">

          <span>
            REVIEWS
          </span>

          <h2>
            What Our Customers Say
          </h2>

        </div>

        <div className="reviews-grid">

          <div className="review-card">
            <div className="stars">
              ★★★★★
            </div>

            <p>
              "Amazing pizza and
              unbelievable price!"
            </p>

            <h4>
              Rahul
            </h4>
          </div>

          <div className="review-card">
            <div className="stars">
              ★★★★★
            </div>

            <p>
              "₹2 pizza with free
              delivery. Amazing!"
            </p>

            <h4>
              Priya
            </h4>
          </div>

          <div className="review-card">
            <div className="stars">
              ★★★★★
            </div>

            <p>
              "Very easy ordering
              system and great taste."
            </p>

            <h4>
              Akash
            </h4>
          </div>

        </div>

      </section>

      {/* =========================
          AUTH MODAL
      ========================= */}

      {showAuth && (

        <div
          className="modal-overlay"
          onClick={() =>
            setShowAuth(false)
          }
        >

          <div
            className="auth-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              className="close-modal"
              onClick={() =>
                setShowAuth(false)
              }
            >
              ×
            </button>

            <div className="auth-icon">
              🍕
            </div>

            {/* =========================
                OTP SCREEN
            ========================= */}

            {authStep === "otp" ? (

              <>
                <h2>
                  Verify Your Email
                </h2>

                <p className="auth-subtitle">
                  We sent a 6-digit OTP to
                  <br />
                  <strong>
                    {email}
                  </strong>
                </p>

                <form
                  onSubmit={
                    handleVerifyOtp
                  }
                >

                  <label>
                    Enter OTP
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) =>
                      setOtp(
                        e.target.value.replace(
                          /\D/g,
                          ""
                        )
                      )
                    }
                  />

                  <button
                    className="login-submit"
                    type="submit"
                    disabled={loading}
                  >
                    {loading
                      ? "Verifying..."
                      : "Verify Email"}
                  </button>

                </form>

                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={loading}
                  style={{
                    width: "100%",
                    marginTop: "12px",
                    border: "none",
                    background: "transparent",
                    color: "#f4511e",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Resend OTP
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthStep("form");
                    setAuthMode("register");
                    setOtp("");
                  }}
                  style={{
                    width: "100%",
                    marginTop: "10px",
                    border: "none",
                    background: "transparent",
                    color: "#777",
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
              </>

            ) : authMode === "register" ? (

              /* =========================
                 REGISTER SCREEN
              ========================= */

              <>
                <h2>
                  Create Account
                </h2>

                <p className="auth-subtitle">
                  Create your PizzaHub
                  account to order pizza.
                </p>

                <form
                  onSubmit={
                    handleRegister
                  }
                >

                  <label>
                    Full Name
                  </label>

                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) =>
                      setName(
                        e.target.value
                      )
                    }
                  />

                  <label>
                    Email Address
                  </label>

                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) =>
                      setEmail(
                        e.target.value
                      )
                    }
                  />

                  <label>
                    Password
                  </label>

                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                  />

                  <label>
                    Confirm Password
                  </label>

                  <input
                    type="password"
                    placeholder="Confirm your password"
                    value={
                      confirmPassword
                    }
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                  />

                  <button
                    className="login-submit"
                    type="submit"
                    disabled={loading}
                  >
                    {loading
                      ? "Creating Account..."
                      : "Create Account"}
                  </button>

                </form>

                <p className="login-note">
                  Already have an account?
                </p>

                <button
                  type="button"
                  onClick={openLogin}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: "#f4511e",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Login
                </button>
              </>

            ) : (

              /* =========================
                 LOGIN SCREEN
              ========================= */

              <>
                <h2>
                  Welcome Back
                </h2>

                <p className="auth-subtitle">
                  Login to order your
                  favorite pizza.
                </p>

                <form
                  onSubmit={
                    handleLogin
                  }
                >

                  <label>
                    Email Address
                  </label>

                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) =>
                      setEmail(
                        e.target.value
                      )
                    }
                  />

                  <label>
                    Password
                  </label>

                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                  />

                  <button
                    className="login-submit"
                    type="submit"
                    disabled={loading}
                  >
                    {loading
                      ? "Logging in..."
                      : "Login & Continue"}
                  </button>

                </form>

                <p className="login-note">
                  Don't have an account?
                </p>

                <button
                  type="button"
                  onClick={openRegister}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: "#f4511e",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Create Account
                </button>
              </>
            )}

          </div>

        </div>
      )}

      {/* =========================
          CART
      ========================= */}

      {showCart && (

        <div
          className="cart-overlay"
          onClick={() =>
            setShowCart(false)
          }
        >

          <div
            className="cart-drawer"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="cart-header">

              <h2>
                Your Cart 🛒
              </h2>

              <button
                onClick={() =>
                  setShowCart(false)
                }
                className="close-cart"
              >
                ×
              </button>

            </div>

            {cart.length === 0 ? (

              <div className="empty-cart">

                <div>🍕</div>

                <h3>
                  Your cart is empty
                </h3>

                <p>
                  Add some delicious pizza!
                </p>

                <button
                  onClick={() => {
                    setShowCart(false);

                    document
                      .getElementById(
                        "menu"
                      )
                      ?.scrollIntoView({
                        behavior: "smooth",
                      });
                  }}
                >
                  Browse Pizzas
                </button>

              </div>

            ) : (

              <>

                <div className="cart-items">

                  {cart.map(
                    (item) => (

                      <div
                        className="cart-item"
                        key={item.id}
                      >

                        <img
                          src={item.image}
                          alt={item.name}
                        />

                        <div className="cart-item-info">

                          <h4>
                            {item.name}
                          </h4>

                          <strong>
                            ₹2 each
                          </strong>

                          <div className="quantity-controls">

                            <button
                              onClick={() =>
                                decreaseQuantity(
                                  item.id
                                )
                              }
                            >
                              −
                            </button>

                            <span>
                              {item.quantity}
                            </span>

                            <button
                              onClick={() =>
                                increaseQuantity(
                                  item.id
                                )
                              }
                            >
                              +
                            </button>

                          </div>

                        </div>

                        <button
                          className="remove-item"
                          onClick={() =>
                            removeFromCart(
                              item.id
                            )
                          }
                        >
                          🗑️
                        </button>

                      </div>

                    )
                  )}

                </div>

                <div className="cart-summary">

                  <div>
                    <span>
                      Subtotal
                    </span>

                    <strong>
                      ₹{subtotal}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Delivery
                    </span>

                    <strong className="free-text">
                      FREE
                    </strong>
                  </div>

                  <div className="total-row">

                    <span>
                      Total
                    </span>

                    <strong>
                      ₹{total}
                    </strong>

                  </div>

                  <div className="delivery-message">
                    🚚 Free delivery included!
                  </div>

                  <button
  className="checkout-btn"
  onClick={handlePayment}
  disabled={loading}
>
  {loading
    ? "Opening Payment..."
    : `Continue to Payment — ₹${total}`}
</button>

                </div>

              </>
            )}

          </div>

        </div>
      )}

      {/* =========================
          TOAST
      ========================= */}

      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

      {/* =========================
          FOOTER
      ========================= */}

      <footer>

        <div className="footer-logo">
          🍕 Pizza<span>Hub</span>
        </div>

        <p>
          Delicious pizza at an
          amazing price.
        </p>

        <p className="copyright">
          © 2026 PizzaHub.
          All rights reserved.
        </p>

      </footer>

    </div>
  );
}

export default App;