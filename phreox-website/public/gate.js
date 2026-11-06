// The login of the page that is shown to everybody who is not (yet) a member of the team.
const english = !navigator.language.toLowerCase().startsWith("de");
const form = document.getElementById("form");
const error = document.getElementById("error");
const messages = {
  de: { "team-only": "Dieser Account gehört nicht zum Team.", invalid: "Benutzername oder Passwort stimmt nicht.", throttled: "Zu viele Versuche. Bitte warte einen Moment.", failed: "Das hat nicht geklappt." },
  en: { "team-only": "This account is not part of the team.", invalid: "Username or password is wrong.", throttled: "Too many attempts. Please wait a moment.", failed: "That did not work." },
}[english ? "en" : "de"];

document.documentElement.lang = english ? "en" : "de";
document.querySelectorAll("[data-de]").forEach((node) => { node.textContent = english ? node.dataset.en : node.dataset.de; });

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  error.textContent = "";

  const button = form.querySelector("button");

  button.disabled = true;

  try {
    const response = await fetch("/_auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.username.value, password: form.password.value }),
    });

    if (response.ok) return location.reload();

    const text = (await response.json().catch(() => ({}))).error;

    error.textContent = text === "team-only" ? messages["team-only"] : response.status === 401 ? messages.invalid : response.status === 403 || response.status === 429 ? messages.throttled : messages.failed;
  } catch {
    error.textContent = messages.failed;
  } finally {
    button.disabled = false;
  }
});
