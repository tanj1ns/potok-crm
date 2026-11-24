(function () {
  try {
    var t = localStorage.getItem('potok_theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
