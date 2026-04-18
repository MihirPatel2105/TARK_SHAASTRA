// Gujarat districts with approximate center coordinates
export const gujaratDistricts = [
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Surat", lat: 21.1458, lng: 72.8336 },
  { name: "Vadodara", lat: 22.3072, lng: 73.1812 },
  { name: "Rajkot", lat: 22.3039, lng: 70.8022 },
  { name: "Jamnagar", lat: 22.4707, lng: 70.0883 },
  { name: "Junagadh", lat: 21.5158, lng: 70.4725 },
  { name: "Bhavnagar", lat: 21.7645, lng: 72.1519 },
  { name: "Anand", lat: 22.5697, lng: 72.9325 },
  { name: "Kheda", lat: 22.2783, lng: 72.6915 },
  { name: "Panchmahal", lat: 22.0783, lng: 73.3205 },
  { name: "Narmada", lat: 21.8844, lng: 73.7331 },
  { name: "Valsad", lat: 20.6229, lng: 72.9337 },
  { name: "Navsari", lat: 20.9676, lng: 72.9337 },
  { name: "Tapi", lat: 21.1847, lng: 72.7881 },
  { name: "Gandhinagar", lat: 23.1815, lng: 72.6297 },
  { name: "Sabarkantha", lat: 23.6231, lng: 72.4995 },
  { name: "Aravalli", lat: 23.2461, lng: 72.7311 },
  { name: "Mahisagar", lat: 22.0636, lng: 73.5627 },
  { name: "Gir Somnath", lat: 21.1938, lng: 70.3659 },
  { name: "Botad", lat: 22.6572, lng: 71.8186 },
  { name: "Chhota Udaipur", lat: 22.3261, lng: 73.3186 },
  { name: "Dohad", lat: 22.7988, lng: 74.2549 },
  { name: "Banaskantha", lat: 23.6349, lng: 72.3399 },
  { name: "Devbhumi Dwarka", lat: 22.2394, lng: 68.9678 },
  { name: "Kutch", lat: 23.8106, lng: 70.2237 }
];

export function getDistrictFromCoordinates(lat, lng) {
  if (!lat || !lng) {
    return null;
  }

  let closestDistrict = null;
  let closestDistance = Infinity;

  gujaratDistricts.forEach((district) => {
    const distance = Math.sqrt(
      Math.pow(lat - district.lat, 2) + Math.pow(lng - district.lng, 2)
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestDistrict = district.name;
    }
  });

  return closestDistrict;
}

export function getDistrictList() {
  return gujaratDistricts.map((d) => d.name).sort();
}
