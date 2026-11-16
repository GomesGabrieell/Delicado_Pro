export const config = globalThis.delicadoConfig;

export const portalClient = config?.url && /^sb_publishable_/.test(config?.key) && globalThis.supabase
  ? globalThis.supabase.createClient(config.url, config.key, {
      auth: { flowType: 'pkce', storageKey: 'delicado-portal-session' },
    })
  : null;

export async function portalDestination(client, userId) {
  const { data, error } = await client.from('company_members').select('company_id')
    .eq('user_id', userId).eq('status', 'active').limit(1);
  if (error) throw error;
  return data.length ? '/admin' : '/cliente';
}

const draftKey = (userId) => 'delicado-quote:' + config.portal + ':' + userId;

export function readDraft(userId) {
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey(userId)));
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return {};
    if (!Array.isArray(draft.items)) delete draft.items;
    if (draft.form && !Array.isArray(draft.form.services)) {
      draft.form = { ...draft.form, services: [] };
    }
    return draft;
  } catch {
    return {};
  }
}

export function saveDraft(userId, draft) {
  sessionStorage.setItem(draftKey(userId), JSON.stringify(draft));
}

export function clearDraft(userId) {
  if (!userId) return;
  try {
    sessionStorage.removeItem(draftKey(userId));
  } catch {
    // Storage may be unavailable even after a successful server operation.
  }
}

export function quantityValue(value, kind) {
  const normalized = String(value).trim().replace(',', '.');
  const pattern = kind === 'material' ? /^\d{1,9}(?:\.\d{1,3})?$/ : /^\d{1,9}$/;
  return pattern.test(normalized) && Number(normalized) > 0 ? Number(normalized) : null;
}
