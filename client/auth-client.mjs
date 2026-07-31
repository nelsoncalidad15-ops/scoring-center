import {
  acceptInvite,
  getUser,
  handleAuthCallback,
  login,
  logout,
  onAuthChange,
  requestPasswordRecovery,
  updateUser,
} from "@netlify/identity";

let inviteToken = null;

function safeMessage(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("identity") || message.includes("not configured")) {
    return "El acceso interno todav?a no est? habilitado para este sitio.";
  }
  if (message.includes("invalid") || message.includes("credentials")) {
    return "El correo o la contrase?a no son v?lidos.";
  }
  return "No se pudo completar el acceso. Intent? nuevamente o contact? al administrador.";
}

async function initialize() {
  try {
    const callback = await handleAuthCallback();
    if (callback?.type === "invite" && callback.token) {
      inviteToken = callback.token;
      return { user: null, flow: "invite" };
    }
    if (callback?.type === "recovery") {
      return { user: callback.user || null, flow: "recovery" };
    }
    return { user: callback?.user || await getUser(), flow: "login" };
  } catch (error) {
    return { user: null, flow: "error", message: safeMessage(error) };
  }
}

async function signIn(email, password) {
  try {
    return { user: await login(email, password) };
  } catch (error) {
    throw new Error(safeMessage(error));
  }
}

async function finishInvite(password) {
  if (!inviteToken) throw new Error("La invitaci?n ya no est? disponible. Ped? una nueva invitaci?n.");
  try {
    const user = await acceptInvite(inviteToken, password);
    inviteToken = null;
    return { user };
  } catch (error) {
    throw new Error(safeMessage(error));
  }
}

async function finishRecovery(password) {
  try {
    return { user: await updateUser({ password }) };
  } catch (error) {
    throw new Error(safeMessage(error));
  }
}

async function requestRecovery(email) {
  try {
    await requestPasswordRecovery(email);
  } catch (error) {
    throw new Error(safeMessage(error));
  }
}

async function signOut() {
  try {
    await logout();
  } catch (error) {
    throw new Error(safeMessage(error));
  }
}

window.ScoringIdentity = {
  finishInvite,
  finishRecovery,
  initialize,
  requestRecovery,
  signIn,
  signOut,
  subscribe: onAuthChange,
};
