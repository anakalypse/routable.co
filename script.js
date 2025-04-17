// Routable JS - Includes Address Lookup, Form Behavior, and Dynamic Pricing

const mapboxToken = 'pk.eyJ1IjoiYW5ha2FseXBzZSIsImEiOiJjazBlankxa2MwaXI0M2RwODlqZDlnajZxIn0.OxhIZtQVLRUW8jbBoa8x7w';

const metroZips = new Set([
  // Expanded list of metro area ZIP codes (alphabetized by ZIP prefix)
  '02108', '02109', '02110', '02111', '02113', '02114', '02115', '02116', '02118', '02119', '02120', '02121',
  '10001', '10002', '10003', '10004', '10005', '10006', '10007', '10009', '10010', '10011', '10012', '10013', '10014',
  '20001', '20002', '20003', '20004', '20005', '20006', '20007', '20008', '20009', '20010',
  '30303', '30305', '30306', '30307', '30308', '30309', '30310', '30311', '30312',
  '33101', '33125', '33126', '33127', '33128', '33129', '33130', '33131', '33132', '33133', '33134',
  '37203', '37206', '37207', '37208', '37209', '37210', '37211', '37212',
  '48201', '48202', '48204', '48206', '48207', '48208', '48209', '48210', '48211',
  '60601', '60602', '60603', '60604', '60605', '60606', '60607', '60608', '60609', '60610',
  '75201', '75202', '75203', '75204', '75205', '75206', '75207', '75208', '75209', '75210',
  '78701', '78702', '78703', '78704', '78705', '78721', '78722', '78723',
  '80202', '80203', '80204', '80205', '80206', '80207', '80209', '80210',
  '85004', '85006', '85007', '85008', '85009', '85012', '85013', '85014', '85015',
  '90001', '90002', '90003', '90004', '90005', '90006', '90007', '90008', '90010', '90011',
  '94102', '94103', '94104', '94105', '94107', '94108', '94109', '94110', '94111', '94112', '94114',
  '98001', '98002', '98003', '98023', '98030', '98031', '98032', '98047', '98092',
  '98101', '98102', '98103', '98104', '98105', '98106', '98107', '98108', '98109', '98115', '98116',
  '98117', '98118', '98119', '98121', '98122', '98125', '98126', '98133', '98134', '98136', '98144',
  '98146', '98148', '98154', '98155', '98158', '98161', '98164', '98166', '98168', '98174', '98177',
  '98178', '98188', '98195', '98198', '98199', '98402', '98403', '98405', '98406', '98407', '98408'
]);

function setupSuggestionBox(inputId) {
  const input = document.getElementById(inputId);
  const suggestionBox = document.createElement('div');
  suggestionBox.className = 'suggestion-box';
  input.parentNode.appendChild(suggestionBox);

  input.addEventListener('input', async () => {
    const query = input.value;
    if (query.length < 3) return (suggestionBox.innerHTML = '');

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json?access_token=${mapboxToken}&autocomplete=true&country=US`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      suggestionBox.innerHTML = '';

      data.features.forEach((place) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = place.place_name;
        item.addEventListener('click', () => {
          input.value = place.place_name;
          suggestionBox.innerHTML = '';
          input.dataset.lat = place.center[1];
          input.dataset.lon = place.center[0];
          input.dataset.zip = extractZip(place);
        });
        suggestionBox.appendChild(item);
      });
    } catch (err) {
      console.error('Suggestion error:', err);
    }
  });

  document.addEventListener('click', (e) => {
    if (!suggestionBox.contains(e.target) && e.target !== input) {
      suggestionBox.innerHTML = '';
    }
  });
}

function extractZip(place) {
  const zip = place.context?.find((c) => c.id.includes('postcode'));
  return zip ? zip.text : '';
}

function calculateMileage(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 3958.8; // miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function estimateCost(miles, zip1, zip2) {
  const bothMetro = metroZips.has(zip1) && metroZips.has(zip2);
  if (miles <= 10 && bothMetro) return '$2';
  if (miles <= 10) return '$5';
  if (miles <= 25 && bothMetro) return '$10';
  if (miles <= 25) return '$15';
  return bothMetro ? '$20' : '$30';
}

function setupPricing() {
  const start = document.getElementById('start-address');
  const dest = document.getElementById('destination-address');
  const resultBox = document.createElement('div');
  resultBox.className = 'message';
  start.parentNode.appendChild(resultBox);

  const handler = () => {
    const lat1 = parseFloat(start.dataset.lat);
    const lon1 = parseFloat(start.dataset.lon);
    const lat2 = parseFloat(dest.dataset.lat);
    const lon2 = parseFloat(dest.dataset.lon);
    const zip1 = start.dataset.zip;
    const zip2 = dest.dataset.zip;
    if (lat1 && lon1 && lat2 && lon2 && zip1 && zip2) {
      const miles = calculateMileage(lat1, lon1, lat2, lon2);
      const cost = estimateCost(miles, zip1, zip2);
      resultBox.textContent = `Estimated Cost: ${cost} (${miles.toFixed(1)} mi)`;
      resultBox.classList.add('success');
    }
  };

  start.addEventListener('change', handler);
  dest.addEventListener('change', handler);
}

document.addEventListener('DOMContentLoaded', () => {
  setupSuggestionBox('start-address');
  setupSuggestionBox('destination-address');
  setupPricing();
});
