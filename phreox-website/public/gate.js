// The login of the page that is shown to everybody who is not (yet) a member of the team.
const english = !navigator.language.toLowerCase().startsWith("de");
const form = document.getElementById("form");
const error = document.getElementById("error");
const codeField = document.getElementById("code-field");
const codeLabel = document.getElementById("code-label");
const mail = document.getElementById("mail");
const messages = {
  de: { "team-only": "Dieser Account gehört nicht zum Team.", invalid: "Benutzername oder Passwort stimmt nicht.", throttled: "Zu viele Versuche. Bitte warte einen Moment.", failed: "Das hat nicht geklappt.", "mfa-wrong": "Der Code stimmt nicht.", sent: "Der Code ist unterwegs, schau in dein Postfach.", totp: "Code der Authenticator-App", email: "Code aus der E-Mail" },
  en: { "team-only": "This account is not part of the team.", invalid: "Username or password is wrong.", throttled: "Too many attempts. Please wait a moment.", failed: "That did not work.", "mfa-wrong": "The code is wrong.", sent: "The code is on its way, check your inbox.", totp: "Code of the authenticator app", email: "Code from the email" },
}[english ? "en" : "de"];

document.documentElement.lang = english ? "en" : "de";
document.querySelectorAll("[data-de]").forEach((node) => { node.textContent = english ? node.dataset.en : node.dataset.de; });

/** The password was right and the account asks for a second step: the code field appears, and the mail button when codes by mail are set up. */
function askForCode(methods) {
  const list = methods.split(",").map((method) => method.trim());

  codeField.hidden = false;
  mail.hidden = !list.includes("email");
  codeLabel.textContent = list.includes("totp") ? messages.totp : messages.email;
  form.code.focus();
}

function credentials() {
  return JSON.stringify({ username: form.username.value, password: form.password.value, code: form.code.value.trim() || undefined });
}

mail.addEventListener("click", async () => {
  error.textContent = "";
  mail.disabled = true;

  try {
    const response = await fetch("/_auth/login/email-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: credentials() });

    error.textContent = response.ok ? messages.sent : messages.failed;
  } catch {
    error.textContent = messages.failed;
  } finally {
    mail.disabled = false;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  error.textContent = "";

  const button = form.querySelector("button[type=submit]");

  button.disabled = true;

  try {
    const response = await fetch("/_auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: credentials() });

    if (response.ok) return location.reload();

    const text = String((await response.json().catch(() => ({}))).error ?? "");

    if (text.startsWith("mfa-required:")) {
      askForCode(text.slice("mfa-required:".length));
      return;
    }

    error.textContent = text === "team-only" ? messages["team-only"] : text === "mfa-wrong" ? messages["mfa-wrong"] : response.status === 401 ? messages.invalid : response.status === 403 || response.status === 429 ? messages.throttled : messages.failed;
  } catch {
    error.textContent = messages.failed;
  } finally {
    button.disabled = false;
  }
});
