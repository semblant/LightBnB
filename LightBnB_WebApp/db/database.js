const { Pool } = require('pg');

const pool = new Pool({
  user: "labber",
  password: "labber",
  host: "localhost",
  database: "lightbnb"
});


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query('SELECT * FROM users WHERE email = $1', [email])
    .then((res) => {
      return res.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
      throw err.message;
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query('SELECT * FROM users WHERE id = $1', [id])
    .then((res) => {
      return res.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
      throw err.message;
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  const values = [user.name, user.email, user.password];
  return pool.query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *;`, values)
    .then((res) => {
      return res.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
      throw err.message;
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const values = [guest_id, limit];
  return pool
    .query(
      `
      SELECT
        properties.*,
        reservations.guest_id,
        AVG(rating) AS average_rating
      FROM reservations
      JOIN properties ON properties.id = reservations.property_id
      JOIN property_reviews ON property_reviews.reservation_id = reservations.id
      WHERE reservations.guest_id = $1
      AND reservations.end_date IS NOT NULL
      GROUP BY properties.id, reservations.guest_id, reservations.start_date
      ORDER BY reservations.start_date
      LIMIT $2
      `, values
    )
    .then((res) => {
      return res.rows;
    })
    .catch((err) => {
      console.log(err.message);
      throw err.message;
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
  let queryValues = []; // holds query paramters
  let queryConditions = []; // holds passed in filter values
  let queryString =  `
  SELECT
    properties.*,
    AVG(property_reviews.rating) AS average_rating
  FROM properties
  LEFT JOIN property_reviews ON properties.id = property_id
  `;

  if (options.owner_id) {
    queryValues.push(`${options.owner_id}`);
    queryConditions.push(`properties.owner_id = $${queryValues.length}`);
  }

  if (options.city) {
    queryValues.push(`%${options.city}%`);
    queryConditions.push(`city ILIKE $${queryValues.length}`); // Add condition to array
  }

  if (options.minimum_price_per_night) {
    const min = options.minimum_price_per_night * 100;
    queryValues.push(min);
    queryConditions.push(`cost_per_night >= $${queryValues.length}`);
  }

  if (options.maximum_price_per_night) {
    const max = options.maximum_price_per_night * 100;
    queryValues.push(max);
    queryConditions.push(`cost_per_night <= $${queryValues.length}`);
  }

  if (queryValues.length > 0) {
    queryString += `WHERE ${queryConditions.join(` AND `)}`;
  }

  queryString += ` GROUP BY properties.id`;

  if (options.minimum_rating) {
    queryValues.push(options.minimum_rating);
    queryString += ` HAVING AVG(property_reviews.rating) >= $${queryValues.length}`;
  }

  queryValues.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryValues.length};
  `;

  console.log(queryString, queryValues); // Debug

  return pool
    .query(queryString, queryValues)
    .then((res) => {
      return res.rows;
    })
    .catch((err) => {
      console.log(err.message);
      throw err.message;
    });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const keys = Object.keys(property); // get property details
  const values = Object.values(property); // get the values passed in
  const placeholders = values.map((_, index) => `$${index + 1}`).join(", "); // generate placeholders
  const queryString = `
  INSERT INTO properties (
    ${keys.join(", ")} -- join keys in SQL format
  )
  VALUES (
    ${placeholders} -- use placeholders for values
  )
  RETURNING *;
  `;

  console.log(queryString, values); // Debug

  return pool
    .query(queryString, values)
    .then((res) => {
      return res.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
      throw err.message;
    });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
