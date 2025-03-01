// prisma/seed.js
const { OpenAI } = require("openai");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the prompt for generating 100 destination objects
const prompt = `
Provide exactly a JSON array of 100 destination objects. Each object should have the following keys:
- "city": a famous city name (string or an object with a "name" key).
- "country": the country name (string or an object with a "name" key).
- "clues": an array of 2 strings, each being a clue about the destination.
- "fun_fact": an array of 2 strings, each being a fun fact about the destination.
- "trivia": an array of 2 strings, each being a trivia statement about the destination.
Output only valid JSON with no additional text.
`;

/**
 * Calls the OpenAI API to generate destination data and extracts valid JSON.
 */
async function generateDestinations() {
  console.log("Requesting destination data from OpenAI...");
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    store: true,
    messages: [{ role: "user", content: prompt }],
  });

  let resultText = completion.choices[0].message.content;

  // Extract the JSON array from the response if extra text is present.
  const startIndex = resultText.indexOf("[");
  const endIndex = resultText.lastIndexOf("]");
  if (startIndex !== -1 && endIndex !== -1) {
    resultText = resultText.substring(startIndex, endIndex + 1);
  } else {
    throw new Error("Could not find JSON array in the response");
  }
  resultText = resultText.replace(/,\s*([\]}])/g, "$1");

  try {
    const destinations = JSON.parse(resultText);
    console.log("Successfully generated destination data.");
    return destinations;
  } catch (error) {
    console.error("Error parsing destination data:", error);
    throw error;
  }
}

/**
 * Seeds the database with destination data.
 * Uses upsert for country and city creation and batches creation of city descriptions.
 */
async function seedDatabase() {
  const destinations = await generateDestinations();

  for (const dest of destinations) {
    // Ensure we extract the proper string values.
    const countryName =
      typeof dest.country === "object" ? dest.country.name : dest.country;
    const cityName = typeof dest.city === "object" ? dest.city.name : dest.city;

    // Upsert the Country record.
    const country = await prisma.country.upsert({
      where: { name: countryName },
      update: {},
      create: { name: countryName },
    });
    console.log(`Upserted country: ${countryName}`);

    // Upsert the City record.
    const city = await prisma.city.upsert({
      where: { name: cityName },
      update: {},
      create: {
        name: cityName,
        country: { connect: { id: country.id } },
      },
    });
    console.log(`Upserted city: ${cityName}`);

    // Batch create city descriptions concurrently.
    const cluePromises = dest.clues.map((clue) =>
      prisma.cityDescription.create({
        data: {
          type: "CLUE",
          description: clue,
          city: { connect: { id: city.id } },
        },
      })
    );

    const funFactPromises = dest.fun_fact.map((fact) =>
      prisma.cityDescription.create({
        data: {
          type: "FUN_FACT",
          description: fact,
          city: { connect: { id: city.id } },
        },
      })
    );

    const triviaPromises = dest.trivia.map((trivia) =>
      prisma.cityDescription.create({
        data: {
          type: "TRIVIA",
          description: trivia,
          city: { connect: { id: city.id } },
        },
      })
    );

    await Promise.all([...cluePromises, ...funFactPromises, ...triviaPromises]);

    console.log(`Seeded destination: ${cityName}, ${countryName}`);
  }
}

// Run the seed script.
seedDatabase()
  .catch((error) => {
    console.error("Seeding error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
