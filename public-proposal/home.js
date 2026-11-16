const toggle = document.querySelector('.home-menu-toggle');
const navigation = document.getElementById('navegacao-home');
const compact = matchMedia('(width < 56rem)');

function setOpen(open) {
  navigation.hidden = compact.matches && !open;
  toggle.setAttribute('aria-expanded', String(open));
}

function syncViewport() {
  const active = document.activeElement;
  toggle.hidden = !compact.matches;
  setOpen(false);
  if (compact.matches && navigation.contains(active)) toggle.focus();
  if (!compact.matches && active === toggle) navigation.querySelector('a').focus();
}

toggle.addEventListener('click', () => setOpen(navigation.hidden));
compact.addEventListener('change', syncViewport);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && compact.matches && !navigation.hidden) {
    setOpen(false);
    toggle.focus();
  }
});

navigation.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!compact.matches || !link || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  setOpen(false);
  if (link.hash === '#decoracao') document.getElementById('decoracao').focus({ preventScroll: true });
});

syncViewport();
