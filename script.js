const countdown = document.querySelector("#countdown");
const dayMilliseconds = 86_400_000;

function updateCountdown() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const christmas = new Date(now.getFullYear(), 11, 25);
  if (today > christmas) christmas.setFullYear(christmas.getFullYear() + 1);

  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const christmasUtc = Date.UTC(christmas.getFullYear(), christmas.getMonth(), christmas.getDate());
  countdown.textContent = (christmasUtc - todayUtc) / dayMilliseconds;
}

updateCountdown();
window.setInterval(updateCountdown, 60_000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updateCountdown();
});

const pinScreen = document.querySelector("#pin-screen");
const pinDots = document.querySelector("#pin-dots");
const pinFeedback = document.querySelector("#pin-feedback");
const pinButtons = document.querySelector(".pin-keypad");
const correctPin = "2345";
let enteredPin = "";

function renderPin() {
  [...pinDots.children].forEach((dot, index) => {
    dot.classList.toggle("is-filled", index < enteredPin.length);
  });
  pinDots.setAttribute("aria-label", `${enteredPin.length} of 4 digits entered`);
}

function enterPinDigit(digit) {
  if (enteredPin.length >= 4) return;
  enteredPin += digit;
  pinFeedback.textContent = "Enter your four-digit passcode";
  pinFeedback.classList.remove("is-error");
  renderPin();

  if (enteredPin.length !== 4) return;
  if (enteredPin === correctPin) {
    pinScreen.classList.add("is-unlocking");
    document.body.classList.remove("is-locked");
    window.setTimeout(() => {
      pinScreen.hidden = true;
    }, 500);
    return;
  }

  enteredPin = "";
  pinFeedback.textContent = "That code didn't work. Try again.";
  pinFeedback.classList.add("is-error");
  pinScreen.classList.remove("is-shaking");
  void pinScreen.offsetWidth;
  pinScreen.classList.add("is-shaking");
  renderPin();
}

pinButtons.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.pinDigit !== undefined) {
    enterPinDigit(button.dataset.pinDigit);
  } else if (button.dataset.pinAction === "delete") {
    enteredPin = enteredPin.slice(0, -1);
    pinFeedback.textContent = "Enter your four-digit passcode";
    pinFeedback.classList.remove("is-error");
    renderPin();
  } else if (button.dataset.pinAction === "clear") {
    enteredPin = "";
    pinFeedback.textContent = "Enter your four-digit passcode";
    pinFeedback.classList.remove("is-error");
    renderPin();
  }
});

document.addEventListener("keydown", (event) => {
  if (pinScreen.hidden) return;
  if (/^\d$/.test(event.key)) enterPinDigit(event.key);
  if (event.key === "Backspace") {
    enteredPin = enteredPin.slice(0, -1);
    pinFeedback.textContent = "Enter your four-digit passcode";
    pinFeedback.classList.remove("is-error");
    renderPin();
  }
  if (event.key === "Escape") {
    enteredPin = "";
    pinFeedback.textContent = "Enter your four-digit passcode";
    pinFeedback.classList.remove("is-error");
    renderPin();
  }
});

const snowfallCanvas = document.querySelector("#snowfall");
const snowContext = snowfallCanvas.getContext("2d");
const snowflakes = Array.from({ length: 95 }, () => ({
  x: Math.random(),
  y: Math.random(),
  radius: 0.8 + Math.random() * 2.2,
  speed: 0.25 + Math.random() * 0.75,
  drift: (Math.random() - 0.5) * 0.3,
  opacity: 0.3 + Math.random() * 0.6,
}));
const iceCrystals = Array.from({ length: 16 }, () => ({
  x: Math.random(),
  y: Math.random(),
  size: 5 + Math.random() * 8,
  speed: 0.12 + Math.random() * 0.28,
  drift: (Math.random() - 0.5) * 0.18,
  rotation: Math.random() * Math.PI,
  spin: (Math.random() - 0.5) * 0.012,
  phase: Math.random() * Math.PI * 2,
}));
let snowWidth = 0;
let snowHeight = 0;

function resizeSnowfall() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  snowWidth = window.innerWidth;
  snowHeight = window.innerHeight;
  snowfallCanvas.width = Math.round(snowWidth * pixelRatio);
  snowfallCanvas.height = Math.round(snowHeight * pixelRatio);
  snowfallCanvas.style.width = `${snowWidth}px`;
  snowfallCanvas.style.height = `${snowHeight}px`;
  snowContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function animateSnowfall() {
  snowContext.clearRect(0, 0, snowWidth, snowHeight);
  snowflakes.forEach((flake) => {
    flake.y += flake.speed / snowHeight;
    flake.x += flake.drift / snowWidth;
    if (flake.y > 1) {
      flake.y = -0.02;
      flake.x = Math.random();
    }
    if (flake.x < 0) flake.x = 1;
    if (flake.x > 1) flake.x = 0;

    snowContext.beginPath();
    snowContext.arc(flake.x * snowWidth, flake.y * snowHeight, flake.radius, 0, Math.PI * 2);
    snowContext.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
    snowContext.fill();
  });
  iceCrystals.forEach((crystal) => {
    crystal.y += crystal.speed / snowHeight;
    crystal.x += crystal.drift / snowWidth;
    crystal.rotation += crystal.spin;
    crystal.phase += 0.035;
    if (crystal.y > 1.03) {
      crystal.y = -0.03;
      crystal.x = Math.random();
    }
    if (crystal.x < -0.03) crystal.x = 1.03;
    if (crystal.x > 1.03) crystal.x = -0.03;

    const shimmer = 0.45 + (Math.sin(crystal.phase) + 1) * 0.25;
    const x = crystal.x * snowWidth;
    const y = crystal.y * snowHeight;
    const arm = crystal.size;

    snowContext.save();
    snowContext.translate(x, y);
    snowContext.rotate(crystal.rotation);
    snowContext.globalAlpha = shimmer;
    snowContext.shadowColor = "#c8f3ff";
    snowContext.shadowBlur = crystal.size * 1.8;
    snowContext.strokeStyle = "rgba(224, 248, 255, .95)";
    snowContext.lineWidth = 1;
    snowContext.lineCap = "round";
    snowContext.beginPath();
    snowContext.moveTo(0, -arm);
    snowContext.lineTo(0, arm);
    snowContext.moveTo(-arm, 0);
    snowContext.lineTo(arm, 0);
    snowContext.moveTo(-arm * 0.68, -arm * 0.68);
    snowContext.lineTo(arm * 0.68, arm * 0.68);
    snowContext.moveTo(arm * 0.68, -arm * 0.68);
    snowContext.lineTo(-arm * 0.68, arm * 0.68);
    snowContext.stroke();
    snowContext.restore();
  });
  window.requestAnimationFrame(animateSnowfall);
}

window.addEventListener("resize", resizeSnowfall);
resizeSnowfall();
window.requestAnimationFrame(animateSnowfall);

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector("#site-nav");

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  siteNav.classList.toggle("is-open", !isExpanded);
});

siteNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuToggle.setAttribute("aria-expanded", "false");
    siteNav.classList.remove("is-open");
  }
});

const letterForm = document.querySelector("#letter-form");
const formNote = document.querySelector("#form-note");

letterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = new FormData(letterForm).get("name").trim();
  formNote.textContent = `Thanks, ${name}! Your letter is ready for Santa. This demo doesn't send or store it.`;
  formNote.classList.add("is-success");
  letterForm.reset();
});
