// Initialize Supabase client
const SUPABASE_URL = 'https://zszjyfswpplbhjxievhz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpzemp5ZnN3cHBsYmhqeGlldmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4NTU5ODgsImV4cCI6MjA2MDQzMTk4OH0.5oh10-d4zwemTGZCEwfEeXs5C0gqjZid5HF6sDng7j0';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Handle form submission
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('routable-form');
  const messageDiv = document.getElementById('form-message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Parse checkboxes and booleans
    data.walking_flexible = document.getElementById('walking-flexible').checked;
    data.budget_flexible = document.getElementById('budget-flexible').checked;
    data.language = data.language || null;
    data.deadline = data.deadline || null;
    data.urgency_notes = data.urgency_notes || null;
    data.time_notes = data.time_notes || null;
    data.notes = data.notes || null;

    // Parse checkboxes into an array
    const accessibility = [];
    form.querySelectorAll('input[name="accessibility"]:checked').forEach(cb => accessibility.push(cb.value));
    data.accessibility = accessibility.length ? accessibility : null;

    // Submit to Supabase
    const { error } = await supabase.from('requests').insert([data]);

    if (error) {
      messageDiv.textContent = 'Submission failed. Please try again later.';
      messageDiv.className = 'message error';
      console.error(error);
    } else {
      messageDiv.textContent = 'Your request was sent successfully!';
      messageDiv.className = 'message success';
      form.reset();
    }
  });

  // Handle optional flexible deadlines
  const deadlineFlexible = document.getElementById('deadline-flexible');
  const deadlineField = document.getElementById('deadline');
  deadlineFlexible.addEventListener('change', () => {
    deadlineField.disabled = deadlineFlexible.checked;
    deadlineField.required = !deadlineFlexible.checked;
  });

  // Restore previously missing ZIP code and metro detection logic
  const metroZipCodes = [
    "02108", "02109", "02110", "02111", "02114", "02115", "02116", "02118", "02119",
    "02120", "02121", "02122", "02124", "02125", "02126", "02127", "02128", "02129", "02210",
    "98101", "98102", "98103", "98104", "98105", "98106", "98107", "98108", "98109", "98112",
    "98115", "98116", "98117", "98118", "98119", "98121", "98122", "98125", "98126", "98133",
    "98134", "98136", "98144", "98146", "98148", "98154", "98155", "98158", "98164", "98166",
    "98168", "98177", "98178", "98188", "98195", "98198", "98402", "98403", "98405", "98406",
    "98407", "98408", "98409", "98418", "98421", "98424", "98465", "98466", "98467", "98499",
    "10001", "10002", "10003", "10004", "10005", "10006", "10007", "10009", "10010", "10011",
    "10012", "10013", "10014", "10016", "10017", "10018", "10019", "10020", "10021", "10022",
    "10023", "10024", "10025", "10026", "10027", "10028", "10029", "10030", "10031", "10032",
    "10033", "10034", "10035", "10036", "10037", "10038", "10039", "10040", "11201", "11203",
    "11204", "11205", "11206", "11207", "11208", "11209", "11210", "11211", "11212", "11213",
    "11214", "11215", "11216", "11217", "11218", "11219", "11220", "11221", "11222", "11223",
    "11224", "11225", "11226", "11228", "11229", "11230", "11231", "11232", "11233", "11234",
    "11235", "11236", "11237", "11238", "11239", "11249"
  ];

  function isMetroZip(zip) {
    return metroZipCodes.includes(zip);
  }
});
