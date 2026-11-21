// The login of the page that is shown to everybody who is not (yet) a member of the team. Two steps: the name and the password,
// then, for an account with a second factor, the code alone. The second step lives in this page only: loading the page again begins
// with the first.
const english = !navigator.language.toLowerCase().startsWith("de");
const form = document.getElementById("form");
const error = document.getElementById("error");
const stepLogin = document.getElementById("step-login");
const stepCode = document.getElementById("step-code");
const codeLabel = document.getElementById("code-label");
const boxes = [...document.querySelectorAll("#code input")];
const mail = document.getElementById("mail");
const submit = document.getElementById("submit");
const back = document.getElementById("back");
const messages = {
  de: { "team-only": "Dieser Account gehört nicht zum Team.", invalid: "Benutzername oder Passwort stimmt nicht.", throttled: "Zu viele Versuche. Bitte warte einen Moment.", failed: "Das hat nicht geklappt.", "mfa-wrong": "Der Code stimmt nicht.", sent: "Der Code ist unterwegs, schau in dein Postfach.", totp: "Gib den 6-stelligen Code deiner Authenticator-App ein.", email: "Gib den 6-stelligen Code aus der E-Mail ein.", login: "Anmelden", confirm: "Bestätigen" },
  en: { "team-only": "This account is not part of the team.", invalid: "Username or password is wrong.", throttled: "Too many attempts. Please wait a moment.", failed: "That did not work.", "mfa-wrong": "The code is wrong.", sent: "The code is on its way, check your inbox.", totp: "Enter the 6-digit code of your authenticator app.", email: "Enter the 6-digit code from the email.", login: "Log in", confirm: "Confirm" },
}[english ? "en" : "de"];

document.documentElement.lang = english ? "en" : "de";
document.querySelectorAll("[data-de]").forEach((node) => { node.textContent = english ? node.dataset.en : node.dataset.de; });

/** The digits typed so far, in the order of the boxes. */
function code() {
  return boxes.map((box) => box.value).join("");
}

/** Puts digits into the boxes from `start` on (a paste, a code a password manager fills in) and moves on to the box after them. */
function fill(start, digits) {
  [...digits].slice(0, boxes.length - start).forEach((digit, offset) => { boxes[start + offset].value = digit; });
  boxes[Math.min(start + digits.length, boxes.length - 1)].focus();
}

/** Whether the second step is shown. */
function asking() {
  return !stepCode.hidden;
}

/** The password was right and the account asks for a second step: the code is all that is shown, and the mail button when codes by mail are set up. */
function askForCode(methods) {
  const list = methods.split(",").map((method) => method.trim());

  stepLogin.hidden = true;
  stepCode.hidden = false;
  back.hidden = false;
  mail.hidden = !list.includes("email");
  codeLabel.textContent = list.includes("totp") ? messages.totp : messages.email;
  submit.textContent = messages.confirm;
  boxes.forEach((box) => { box.value = ""; });
  boxes[0].focus();
}

/** Back to the name and the password; the code is forgotten. */
function askForLogin() {
  stepCode.hidden = true;
  stepLogin.hidden = false;
  back.hidden = true;
  submit.textContent = messages.login;
  boxes.forEach((box) => { box.value = ""; });
  error.textContent = "";
  form.password.focus();
}

function credentials() {
  return JSON.stringify({ username: form.username.value, password: form.password.value, code: asking() ? code() || undefined : undefined });
}

boxes.forEach((box, index) => {
  box.addEventListener("input", () => {
    const digits = box.value.replace(/\D/g, "");

    box.value = "";
    if (digits) fill(index, digits);
    // The sixth digit logs in: nobody has to press the button after a code.
    if (code().length === boxes.length) form.requestSubmit();
  });
  box.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !box.value && index > 0) {
      boxes[index - 1].value = "";
      boxes[index - 1].focus();
      event.preventDefault();
    }
    if (event.key === "ArrowLeft" && index > 0) boxes[index - 1].focus();
    if (event.key === "ArrowRight" && index < boxes.length - 1) boxes[index + 1].focus();
  });
  box.addEventListener("paste", (event) => {
    const digits = (event.clipboardData?.getData("text") ?? "").replace(/\D/g, "");

    event.preventDefault();
    if (digits) fill(index, digits);
    if (code().length === boxes.length) form.requestSubmit();
  });
  box.addEventListener("focus", () => box.select());
});

back.addEventListener("click", askForLogin);

mail.addEventListener("click", async () => {
  error.textContent = "";
  mail.disabled = true;

  try {
    const response = await fetch("/_auth/login/email-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: form.username.value, password: form.password.value }) });

    error.textContent = response.ok ? messages.sent : messages.failed;
  } catch {
    error.textContent = messages.failed;
  } finally {
    mail.disabled = false;
    boxes[0].focus();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (submit.disabled) return;
  if (asking() && code().length < boxes.length) return;

  error.textContent = "";
  submit.disabled = true;

  try {
    const response = await fetch("/_auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: credentials() });

    if (response.ok) return location.reload();

    const text = String((await response.json().catch(() => ({}))).error ?? "");

    if (text.startsWith("mfa-required:")) {
      askForCode(text.slice("mfa-required:".length));
      return;
    }

    if (asking()) {
      // A wrong code is typed again from the first box; a wrong password behind it goes back to the first step.
      boxes.forEach((box) => { box.value = ""; });
      if (text === "mfa-wrong") boxes[0].focus();
      else askForLogin();
    }

    error.textContent = text === "team-only" ? messages["team-only"] : text === "mfa-wrong" ? messages["mfa-wrong"] : response.status === 401 ? messages.invalid : response.status === 403 || response.status === 429 ? messages.throttled : messages.failed;
  } catch {
    error.textContent = messages.failed;
  } finally {
    submit.disabled = false;
  }
});
