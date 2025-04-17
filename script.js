// Routable JavaScript with city type detection and distance-based pricing (US only)

const METRO_ZIP_CODES = new Set([
  // Expanded zip code prefixes for major US metro areas (alphabetized)
  '021', '022', // Boston, MA
  '100', '101', '104', // New York, NY
  '191', // Philadelphia, PA
  '200', '203', '204', // Washington, DC
  '276', // Raleigh-Durham, NC
  '282', // Charlotte, NC
  '300', '303', '309', // Atlanta, GA
  '328', '331', '333', // Orlando & Miami, FL
  '336', '337', // Tampa Bay, FL
  '372', // Nashville, TN
  '430', '432', '441', '442', '443', // Columbus & Cleveland, OH
  '452', // Cincinnati, OH
  '462', // Indianapolis, IN
  '480', '481', '482', // Detroit, MI
  '503', // Des Moines, IA
  '554', // Minneapolis, MN
  '606', '607', // Chicago, IL
  '631', // St. Louis, MO
  '641', // Kansas City, MO
  '701', // New Orleans, LA
  '722', // Little Rock, AR
  '731', // Oklahoma City, OK
  '750', '752', '753', '760', '761', // Dallas-Fort Worth, TX
  '770', '772', // Houston, TX
  '782', // San Antonio, TX
  '787', // Austin, TX
  '802', '803', // Denver, CO
  '841', // Salt Lake City, UT
  '850', '852', '853', '857', // Phoenix & Tucson, AZ
  '871', // Albuquerque, NM
  '891', // Las Vegas, NV
  '900', '901', '902', '904', '905', '906', '907', '908', '910', '913', '914', '915', // Los Angeles, CA
  '920', '921', '922', // San Diego, CA
  '941', '943', '944', '945', '946', '947', '948', '949', '950', '951', '953', // San Francisco Bay Area, San Jose, CA
  '956', '958', // Sacramento, CA
  '972', '973', // Portland, OR
  '980', '981', '982', '983', '984', // Seattle-Tacoma, WA incl. Federal Way
  '995' // Anchorage, AK
]);

const METRO_THRESHOLD_MILES = 10;
const mapboxApiKey = "pk.eyJ1IjoiYW5ha2FseXBzZSIsImEiOiJjazBlankxa2MwaXI0M2RwODlqZDlnajZxIn0.OxhIZtQVLRUW8jbBoa8x7w";

function isZipMetro(zip) {
  return METRO_ZIP_CODES.has(zip.substring(0, 3));
}

function extractZipCode(feature) {
  return feature.context?.find(c => c.id.startsWith("postcode"))?.text || "";
}

function extractCity(feature) {
  return feature.context?.find(c => c.id.startsWith("place"))?.text || "";
}

function extractState(feature) {
  return feature.context?.find(c => c.id.startsWith("region"))?.text || "";
}

function extractFullAddress(feature) {
  return feature.place_name;
}

async function geocodeAddress(address) {
  const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxApiKey}&country=US`;
  const response = await fetch(endpoint);
  const data = await response.json();
  if (data.features.length > 0) {
    return data.features[0];
  }
  return null;
}

async function calculateDistanceMiles(fromCoords, toCoords) {
  const endpoint = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromCoords[0]},${fromCoords[1]};${toCoords[0]},${toCoords[1]}?access_token=${mapboxApiKey}&overview=false`;
  const response = await fetch(endpoint);
  const data = await response.json();
  if (data.routes.length > 0) {
    return data.routes[0].distance / 1609.34; // meters to miles
  }
  return null;
}

async function calculatePrice(startAddress, endAddress) {
  const startFeature = await geocodeAddress(startAddress);
  const endFeature = await geocodeAddress(endAddress);

  if (!startFeature || !endFeature) return "Unable to calculate";

  const startZip = extractZipCode(startFeature);
  const endZip = extractZipCode(endFeature);

  const startMetro = isZipMetro(startZip);
  const endMetro = isZipMetro(endZip);

  const fromCoords = startFeature.center;
  const toCoords = endFeature.center;

  const miles = await calculateDistanceMiles(fromCoords, toCoords);

  let price = 0;
  if (startMetro && endMetro) {
    price = miles <= METRO_THRESHOLD_MILES ? 5 : 10;
  } else if (!startMetro || !endMetro) {
    price = miles <= METRO_THRESHOLD_MILES ? 10 : 20;
  }
  return `$${price.toFixed(2)} (approx. ${miles.toFixed(1)} mi)`;
}

function updatePriceOnChange() {
  const priceOutput = document.getElementById("price");
  const startInput = document.getElementById("start-address");
  const endInput = document.getElementById("destination-address");

  const handler = async () => {
    const startAddress = startInput.value;
    const endAddress = endInput.value;
    if (startAddress && endAddress) {
      priceOutput.value = "Calculating...";
      const price = await calculatePrice(startAddress, endAddress);
      priceOutput.value = price;
    }
  };

  startInput.addEventListener("change", handler);
  endInput.addEventListener("change", handler);
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const priceOutput = document.getElementById("price");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const startAddress = document.getElementById("start-address").value;
    const destinationAddress = document.getElementById("destination-address").value;

    if (!startAddress || !destinationAddress) {
      alert("Please enter both starting and destination addresses.");
      return;
    }

    priceOutput.value = "Calculating...";
    const price = await calculatePrice(startAddress, destinationAddress);
    priceOutput.value = price;
  });

  updatePriceOnChange();
});
