(() => {
  const form = document.getElementById("aqDailyVerseForm");
  if (!form) return;
  const email = document.getElementById("aqDailyVerseEmail");
  const button = document.getElementById("aqDailyVerseSubmit");
  const status = document.getElementById("aqDailyVerseStatus");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";
    if (!email.checkValidity()) {
      email.reportValidity();
      return;
    }
    button.disabled = true;
    button.textContent = "Please wait…";
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value.trim(),
          website: form.elements.website.value
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Signup is temporarily unavailable.");
      form.reset();
      status.textContent = "Please check your inbox to confirm your subscription.";
    } catch (error) {
      status.textContent = error.message || "Something went wrong. Please try again.";
    } finally {
      button.disabled = false;
      button.textContent = "Subscribe";
    }
  });
})();