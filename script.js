const pinScreen = document.querySelector("#pin-screen");
const pinDots = document.querySelector("#pin-dots");
const pinFeedback = document.querySelector("#pin-feedback");
const pinButtons = document.querySelector(".pin-keypad");
const releaseNote = document.querySelector("#release-note");
const photoInput = document.querySelector("#photo-input");
const photoError = document.querySelector("#photo-error");
const previewImage = document.querySelector("#photo-preview");
const cardPhoto = document.querySelector("#card-photo");
const photoPlaceholder = document.querySelector("#photo-placeholder");
const pickerIcon = document.querySelector("#photo-picker-icon");
const pickerCopy = document.querySelector("#photo-picker-copy");
const pickerSubtitle = document.querySelector("#photo-picker-subtitle");
const message = document.querySelector("#birthday-message");
const shareInput = document.querySelector("#share-link");
const shareStatus = document.querySelector("#share-status");

const RELEASE_AT = Date.parse("2026-11-16T07:12:42Z");
const CARD_PIN = "2206";
const BIRTHDAY_MESSAGE = "Happy birthday, Mercy! Even with distance between us, I still carry so much gratitude for the memories, laughter, care, and beautiful moments we shared. What we had will always mean something to me, and I will always wish you joy, love, peace, and every good thing you deserve. May this new year bring you closer to all the dreams in your heart. Happy birthday, beautiful soul. — Atera";
const PHOTO_DATABASE = "mercy-birthday-card";
const PHOTO_STORE = "photos";
const PHOTO_KEY = "mercy-photo";
let releaseTimer = 0;

function openPhotoDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("This browser cannot save photos between visits."));
      return;
    }

    const request = window.indexedDB.open(PHOTO_DATABASE, 1);
    request.addEventListener("upgradeneeded", () => {
      request.result.createObjectStore(PHOTO_STORE);
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error || new Error("The photo store could not be opened.")));
  });
}

async function savePhoto(blob) {
  const database = await openPhotoDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE, "readwrite");
    transaction.objectStore(PHOTO_STORE).put(blob, PHOTO_KEY);
    transaction.addEventListener("complete", resolve, { once: true });
    transaction.addEventListener("error", () => reject(transaction.error || new Error("The photo could not be saved.")), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error || new Error("The photo save was canceled.")), { once: true });
  });
}

async function loadPhoto() {
  const database = await openPhotoDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE, "readonly");
    const request = transaction.objectStore(PHOTO_STORE).get(PHOTO_KEY);
    request.addEventListener("success", () => resolve(request.result || null), { once: true });
    request.addEventListener("error", () => reject(request.error || new Error("The saved photo could not be read.")), { once: true });
  });
}

let displayedPhotoUrl = "";

function setPhoto(blob) {
  if (displayedPhotoUrl) URL.revokeObjectURL(displayedPhotoUrl);
  displayedPhotoUrl = URL.createObjectURL(blob);
  previewImage.src = displayedPhotoUrl;
  previewImage.hidden = false;
  cardPhoto.src = displayedPhotoUrl;
  cardPhoto.hidden = false;
  photoPlaceholder.hidden = true;
  pickerIcon.textContent = "✓";
  pickerCopy.textContent = "Change her photo";
  pickerSubtitle.textContent = "Saved only in this browser on this device";
}

async function restorePhoto() {
  try {
    const savedPhoto = await loadPhoto();
    if (savedPhoto instanceof Blob && savedPhoto.type.startsWith("image/")) {
      setPhoto(savedPhoto);
    }
  } catch (error) {
    photoError.textContent = error instanceof Error ? error.message : "The saved photo could not be restored.";
  }
}

async function readPhoto(file) {
  if (!file) return;
  photoError.textContent = "";
  if (!file.type.startsWith("image/")) {
    photoError.textContent = "Please choose an image file.";
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    photoError.textContent = "Choose a photo smaller than 12 MB.";
    return;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 720 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the photo.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const compressedPhoto = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("This browser could not prepare the photo."));
      }, "image/jpeg", 0.84);
    });

    setPhoto(compressedPhoto);
    try {
      await savePhoto(compressedPhoto);
    } catch (error) {
      photoError.textContent = error instanceof Error
        ? `${error.message} The photo will only remain until this page is closed.`
        : "The photo could not be saved and will only remain until this page is closed.";
      pickerSubtitle.textContent = "Not saved — only available until this page closes";
    }
  } catch (error) {
    photoError.textContent = error instanceof Error ? error.message : "The selected photo could not be opened.";
  }
}

photoInput.addEventListener("change", () => {
  readPhoto(photoInput.files?.[0]);
});
restorePhoto();

function renderPin(enteredPin) {
  [...pinDots.children].forEach((dot, index) => {
    dot.classList.toggle("is-filled", index < enteredPin.length);
  });
  pinDots.setAttribute("aria-label", `${enteredPin.length} of 4 digits entered`);
}

let enteredPin = "";
let isUnlocking = false;

function unlockWithPin(pin, automatic = false) {
  if (isUnlocking) return;
  if (!automatic && pin !== CARD_PIN && Date.now() < RELEASE_AT) {
    enteredPin = "";
    pinFeedback.textContent = "That code didn't work. Try again.";
    pinFeedback.classList.add("is-error");
    pinScreen.classList.remove("is-shaking");
    void pinScreen.offsetWidth;
    pinScreen.classList.add("is-shaking");
    renderPin(enteredPin);
    return;
  }

  isUnlocking = true;
  message.textContent = BIRTHDAY_MESSAGE;
  pinScreen.classList.add("is-unlocking");
  document.body.classList.remove("is-locked");
  window.setTimeout(() => {
    pinScreen.hidden = true;
    isUnlocking = false;
  }, 550);
}

function enterPinDigit(digit) {
  if (isUnlocking || enteredPin.length >= 4) return;
  enteredPin += digit;
  pinFeedback.textContent = "Enter your secret code";
  pinFeedback.classList.remove("is-error");
  renderPin(enteredPin);
  if (enteredPin.length === 4) unlockWithPin(enteredPin);
}

pinButtons.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.pinDigit !== undefined) {
    enterPinDigit(button.dataset.pinDigit);
  } else if (button.dataset.pinAction === "delete") {
    enteredPin = enteredPin.slice(0, -1);
    pinFeedback.textContent = "Enter your secret code";
    pinFeedback.classList.remove("is-error");
    renderPin(enteredPin);
  } else if (button.dataset.pinAction === "clear") {
    enteredPin = "";
    pinFeedback.textContent = "Enter your secret code";
    pinFeedback.classList.remove("is-error");
    renderPin(enteredPin);
  }
});

document.addEventListener("keydown", (event) => {
  if (pinScreen.hidden || isUnlocking) return;
  if (/^\d$/.test(event.key)) enterPinDigit(event.key);
  if (event.key === "Backspace") {
    enteredPin = enteredPin.slice(0, -1);
    pinFeedback.textContent = "Enter your secret code";
    pinFeedback.classList.remove("is-error");
    renderPin(enteredPin);
  }
  if (event.key === "Escape") {
    enteredPin = "";
    pinFeedback.textContent = "Enter your secret code";
    pinFeedback.classList.remove("is-error");
    renderPin(enteredPin);
  }
});

const releaseDate = new Date(RELEASE_AT);
releaseNote.textContent = `If unopened, the note opens automatically on ${releaseDate.toLocaleDateString(undefined, {
  year: "numeric",
  month: "long",
  day: "numeric",
})}.`;

function releaseIfReady() {
  if (pinScreen.hidden || isUnlocking) return;
  if (Date.now() >= RELEASE_AT) unlockWithPin(null, true);
}
releaseIfReady();
releaseTimer = window.setTimeout(releaseIfReady, Math.max(0, RELEASE_AT - Date.now()));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) releaseIfReady();
});

const shareUrl = window.location.protocol === "http:" || window.location.protocol === "https:"
  ? `${window.location.origin}${window.location.pathname}`
  : "";
const copyButton = document.querySelector("#copy-link");
const whatsappShare = document.querySelector("#whatsapp-share");
shareInput.value = shareUrl;

if (shareUrl) {
  whatsappShare.href = `https://wa.me/?text=${encodeURIComponent(`Birthday card for Mercy: ${shareUrl}`)}`;
} else {
  copyButton.disabled = true;
  shareStatus.textContent = "Open this card from its GitHub Pages link to share it.";
}

document.querySelector("#copy-link").addEventListener("click", async () => {
  if (!shareUrl) return;
  try {
    await navigator.clipboard.writeText(shareUrl);
    shareStatus.textContent = "Link copied — choose where to share it.";
  } catch {
    shareInput.focus();
    shareInput.select();
    const copied = document.execCommand("copy");
    shareStatus.textContent = copied
      ? "Link copied — choose where to share it."
      : "Select and copy the link above to share the card.";
  }
});

const flowersCanvas = document.querySelector("#flower-canvas");
const flowerContext = flowersCanvas.getContext("2d");
const flowerEmojis = ["🌹", "🌷", "🌸", "🌺", "🌼", "💮", "💐"];
const flowers = Array.from({ length: 26 }, () => ({
  x: Math.random(),
  y: Math.random(),
  size: 12 + Math.random() * 12,
  speed: 0.18 + Math.random() * 0.55,
  drift: (Math.random() - 0.5) * 0.28,
  rotation: (Math.random() - 0.5) * 0.7,
  spin: (Math.random() - 0.5) * 0.008,
  emoji: flowerEmojis[Math.floor(Math.random() * flowerEmojis.length)],
}));
let canvasWidth = 0;
let canvasHeight = 0;

function resizeFlowers() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  flowersCanvas.width = Math.round(canvasWidth * pixelRatio);
  flowersCanvas.height = Math.round(canvasHeight * pixelRatio);
  flowerContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function animateFlowers() {
  flowerContext.clearRect(0, 0, canvasWidth, canvasHeight);
  flowers.forEach((flower) => {
    flower.y += flower.speed / canvasHeight;
    flower.x += flower.drift / canvasWidth;
    flower.rotation += flower.spin;
    if (flower.y > 1.08) {
      flower.y = -0.08;
      flower.x = Math.random();
    }
    if (flower.x < -0.05) flower.x = 1.05;
    if (flower.x > 1.05) flower.x = -0.05;

    flowerContext.save();
    flowerContext.translate(flower.x * canvasWidth, flower.y * canvasHeight);
    flowerContext.rotate(flower.rotation);
    flowerContext.globalAlpha = 0.48;
    flowerContext.font = `${flower.size}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    flowerContext.textAlign = "center";
    flowerContext.textBaseline = "middle";
    flowerContext.fillText(flower.emoji, 0, 0);
    flowerContext.restore();
  });
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.requestAnimationFrame(animateFlowers);
  }
}

window.addEventListener("resize", resizeFlowers);
resizeFlowers();
animateFlowers();
