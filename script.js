// Routable Form Submission Logic

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const confirmationBox = document.createElement('div');
  confirmationBox.className = 'message';
  confirmationBox.style.marginTop = '20px';
  form.appendChild(confirmationBox);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const entries = Object.fromEntries(formData.entries());

    // Add address metadata if available
    ['start-address', 'destination-address'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.dataset.lat && el.dataset.lon && el.dataset.zip) {
        entries[`${id}-lat`] = el.dataset.lat;
        entries[`${id}-lon`] = el.dataset.lon;
        entries[`${id}-zip`] = el.dataset.zip;
      }
    });

    try {
      // For testing: log to console
      console.log('Form submitted:', entries);

      // Future: send data to your backend here
      // await fetch('https://your-server-endpoint.com/submit', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entries)
      // });

      confirmationBox.textContent = 'Form successfully submitted! We'll be in touch soon.';
      confirmationBox.classList.add('success');
      form.reset();
      resetPricing();
    } catch (err) {
      console.error('Submission error:', err);
      confirmationBox.textContent = 'There was an error submitting your request. Please try again later.';
      confirmationBox.classList.remove('success');
    }
  });
});
