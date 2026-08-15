document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('contact-submit');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const payload = {
      name: document.getElementById('l-name').value.trim(),
      phone: document.getElementById('l-phone').value.trim(),
      email: document.getElementById('l-email').value.trim() || null,
      message: document.getElementById('l-message').value.trim(),
      source: 'contact_form'
    };

    const { error } = await supabaseClient.from('leads').insert(payload);
    btn.disabled = false;
    btn.textContent = 'Send Message';

    if (error){
      console.error(error);
      showToast('Could not send message. Please try again.', 'error');
      return;
    }

    showToast('Message sent! We will get back to you soon.', 'success');
    form.reset();
  });
});
