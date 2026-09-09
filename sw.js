self.addEventListener('fetch', (event) => {
  // Apenas permite que o PWA funcione online perfeitamente
  event.respondWith(fetch(event.request));
});