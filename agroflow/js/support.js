document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('support-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('support-submit');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    const payload = {
      name: document.getElementById('s-name').value.trim(),
      phone: document.getElementById('s-phone').value.trim(),
      email: document.getElementById('s-email').value.trim() || null,
      order_number: document.getElementById('s-order').value.trim() || null,
      subject: document.getElementById('s-subject').value.trim(),
      message: document.getElementById('s-message').value.trim()
    };

    const { error } = await supabaseClient.from('support_tickets').insert(payload);
    btn.disabled = false;
    btn.textContent = 'Submit Ticket';

    if (error){
      console.error(error);
      showToast('Could not submit ticket. Please try again.', 'error');
      return;
    }

    showToast('Ticket submitted! Our team will reach out soon.', 'success');
    form.reset();
  });
});
