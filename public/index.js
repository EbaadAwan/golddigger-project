// public/index.js
const priceDisplay = document.getElementById("price-display");
const connectionStatus = document.getElementById("connection-status");

const form = document.querySelector("form");
const investButton = document.getElementById("invest-btn");
const amountInput = document.getElementById("investment-amount");

const purchaseDialog = document.querySelector("dialog.outputs");
const summaryMessage = document.getElementById("investment-summary");
const closeButton = purchaseDialog.querySelector("button");

// Prevent the form from navigating (stops the 404 page redirect)
form.addEventListener("submit", (e) => e.preventDefault());

async function getPrice() {
    try {
        const response = await fetch("/api/price");
        if (!response.ok) throw new Error("Bad response");

        const data = await response.json();
        connectionStatus.textContent = "Live prices 🟢";
        priceDisplay.textContent = `${data.price.toFixed(2)}`;
    } catch {
        connectionStatus.textContent = "Disconnected 🔴";
        priceDisplay.textContent = "----.--";
    }
}

investButton.addEventListener("click", async (e) => {
    e.preventDefault();

    const amount = Number(amountInput.value);

    if (!Number.isFinite(amount) || amount <= 0) {
        summaryMessage.textContent = "Please enter a valid amount greater than 0.";
        purchaseDialog.showModal();
        return;
    }

    try {
        const response = await fetch(
            `/api/invest?amount=${encodeURIComponent(amount)}`
        );

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || "Investment failed. Please try again.");
        }

        const receipt = await response.json();

        summaryMessage.textContent =
            `You invested £${receipt.amount.toFixed(2)} at £${receipt.price.toFixed(
                2
            )} per oz ` + `and received ${receipt.ounces.toFixed(4)} oz of gold.`;

        purchaseDialog.showModal();
    } catch (err) {
        summaryMessage.textContent = err.message || "Disconnected. Please try again.";
        purchaseDialog.showModal();
    }
});

closeButton.addEventListener("click", () => {
    purchaseDialog.close();
});

// Start polling immediately and every ~3.5 seconds
getPrice();
setInterval(getPrice, 3500);