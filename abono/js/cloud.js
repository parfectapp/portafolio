/* ============ ABONO · Nube (Supabase): auth + respaldo de datos ============ */
const Cloud = (() => {
  const URL_ = 'https://fnxifbddgjyzwrolprel.supabase.co';
  const KEY_ = 'sb_publishable_w7oXdy379pRmyYfrtmdwWA_s0GcNacO';
  let sb = null;

  function init() {
    if (sb) return true;
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) return false;
    sb = window.supabase.createClient(URL_, KEY_, { auth: { persistSession: true, autoRefreshToken: true } });
    return true;
  }
  const enabled = () => !!sb;

  // usuario de la sesión guardada (funciona offline: lee localStorage)
  async function sessionUser() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data && data.session ? data.session.user : null;
  }

  const appUrl = () => window.location.origin + window.location.pathname; // a dónde vuelve el enlace del correo
  async function signUp(email, password) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } });
    if (error) throw error;
    return data;
  }
  // Reenvía el correo de confirmación de cuenta.
  async function resendConfirmation(email) {
    const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: appUrl() } });
    if (error) throw error;
  }
  async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }
  async function signOut() { if (sb) { try { await sb.auth.signOut(); } catch (e) {} } }
  async function resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl() }); // vuelve a esta misma app
    if (error) throw error;
  }
  // Avisa cuando el usuario llega desde el enlace del correo para poner nueva contraseña.
  function onRecovery(cb) {
    if (!sb) return;
    sb.auth.onAuthStateChange((event, session) => { if (event === 'PASSWORD_RECOVERY') cb(session ? session.user : null); });
  }
  async function updatePassword(newPassword) {
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  // datos: un documento JSON por usuario en la tabla "greenhouse"
  async function loadData(uid) {
    const { data, error } = await sb.from('greenhouse').select('data').eq('user_id', uid).maybeSingle();
    if (error) throw error;
    return data ? data.data : null;
  }
  async function saveData(uid, obj) {
    const { error } = await sb.from('greenhouse').upsert({ user_id: uid, data: obj, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  return { init, enabled, sessionUser, signUp, signIn, signOut, resetPassword, resendConfirmation, onRecovery, updatePassword, loadData, saveData };
})();
