// Links already shared by the app use the site's root and a token fragment.
if (/^#[a-f0-9]{64}$/.test(location.hash)) {
  location.replace('./proposta.html' + location.hash);
}
