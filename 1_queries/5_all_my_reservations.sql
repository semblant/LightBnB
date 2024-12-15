SELECT
  reservations.id,
  properties.title,
  properties.cost_per_night,
  start_date,
  AVG(property_reviews.rating) AS average_rating
FROM properties
LEFT JOIN reservations ON properties.id = reservations.property_id
LEFT JOIN property_reviews ON property_reviews.property_id = properties.id
WHERE reservations.guest_id = 1
GROUP BY reservations.id, properties.id
ORDER BY start_date ASC
LIMIT 10;
