const createCard = document.getElementById("createCard");
const joinCard = document.getElementById("joinCard");

const newBtn = document.getElementById("newSessionBtn");
const joinBtn = document.getElementById("joinSessionBtn");

let showingCreate = true;

function showCreateRoom() {

    createCard.classList.remove("next-stack-card");
    createCard.classList.add("active-stack-card");

    joinCard.classList.remove("active-stack-card");
    joinCard.classList.add("next-stack-card");

    newBtn.classList.add("active-tab");
    joinBtn.classList.remove("active-tab");

    showingCreate = true;
}

function showJoinRoom() {

    joinCard.classList.remove("next-stack-card");
    joinCard.classList.add("active-stack-card");

    createCard.classList.remove("active-stack-card");
    createCard.classList.add("next-stack-card");

    joinBtn.classList.add("active-tab");
    newBtn.classList.remove("active-tab");

    showingCreate = false;
}

newBtn.addEventListener("click", showCreateRoom);

joinBtn.addEventListener("click", showJoinRoom);

/* =========================
   MOBILE MENU
========================= */

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileNav = document.getElementById("mobileNav");

if (mobileMenuBtn && mobileNav) {

    mobileMenuBtn.addEventListener("click", () => {

        mobileMenuBtn.classList.toggle("active");
        mobileNav.classList.toggle("show");

    });

}

/* =========================
   INSTALL BUTTON
========================= */

const installBtn = document.getElementById("installNowBtn");

if (installBtn) {

    installBtn.addEventListener("click", () => {

        document
            .getElementById("install-section")
            .scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

    });

}

/* =========================
   SWIPE CARDS
========================= */

let startX = 0;
let currentX = 0;

const cardStack = document.querySelector(".card-stack");

if (cardStack) {

    cardStack.addEventListener("touchstart", (e) => {

        startX = e.touches[0].clientX;
        currentX = startX; // Prevent false swipe on tap

    }, { passive: true });

    cardStack.addEventListener("touchmove", (e) => {

        currentX = e.touches[0].clientX;

        const diff = currentX - startX;

        const activeCard = document.querySelector(".active-stack-card");

        if (activeCard) {

            activeCard.style.transition = "none";

            activeCard.style.willChange = "transform";

            activeCard.style.transform =
                `translate3d(${diff}px,0,0)`;
        }

    }, { passive: true });

    cardStack.addEventListener("touchend", () => {

        const diff = currentX - startX;

        const activeCard = document.querySelector(".active-stack-card");

        if (activeCard) {

            activeCard.style.transition =
                "transform .15s cubic-bezier(.22,1,.36,1)";

            activeCard.style.transform =
                "translate3d(0,0,0)";
        }

        if (Math.abs(diff) > 35) {

            if (diff < 0) {

                showJoinRoom();

            } else {

                showCreateRoom();

            }

        }

        startX = 0;
        currentX = 0;

    });

}