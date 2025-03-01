// seed.js
const { OpenAI } = require("openai");
const { PrismaClient } = require("@prisma/client");


const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the prompt for generating 100 destination objects
const prompt = `
Provide a JSON array of 100 destination objects. Each object should have the following keys:
- "city": a famous city name (string).
- "country": the country name (string).
- "clues": an array of 2 strings, each being a clue about the destination.
- "fun_fact": an array of 2 strings, each being a fun fact about the destination.
- "trivia": an array of 2 strings, each being a trivia statement about the destination.
Ensure the JSON is valid and includes exactly 100 objects.
`;

/**
 * Calls the OpenAI API to generate destination data.
 */
async function generateDestinations() {
  console.log("Requesting destination data from OpenAI...");
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini", // adjust model as needed (e.g. "gpt-4" or "gpt-3.5-turbo")
    store: true,
    messages: [
      { role: "user", content: prompt }
    ]
  });
  
  const resultText = completion.choices[0].message.content;
  
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
 */
async function seedDatabase() {
  const destinations = await generateDestinations();

  for (const dest of destinations) {
    // 1. Create or connect the Country
    let country = await prisma.country.findUnique({
      where: { name: dest.country },
    });
    if (!country) {
      country = await prisma.country.create({
        data: { name: dest.country },
      });
      console.log(`Created country: ${dest.country}`);
    }

    // 2. Create or connect the City
    let city = await prisma.city.findUnique({
      where: { name: dest.city },
    });
    if (!city) {
      city = await prisma.city.create({
        data: {
          name: dest.city,
          country: { connect: { id: country.id } },
        },
      });
      console.log(`Created city: ${dest.city}`);
    }

    // 3. Seed CityDescription for clues
    for (const clue of dest.clues) {
      await prisma.cityDescription.create({
        data: {
          type: "CLUE",
          description: clue,
          city: { connect: { id: city.id } },
        },
      });
    }

    // 4. Seed CityDescription for fun facts
    for (const fact of dest.fun_fact) {
      await prisma.cityDescription.create({
        data: {
          type: "FUN_FACT",
          description: fact,
          city: { connect: { id: city.id } },
        },
      });
    }

    // 5. Seed CityDescription for trivia
    for (const trivia of dest.trivia) {
      await prisma.cityDescription.create({
        data: {
          type: "TRIVIA",
          description: trivia,
          city: { connect: { id: city.id } },
        },
      });
    }

    console.log(`Seeded destination: ${dest.city}, ${dest.country}`);
  }
}

// Run the seed script
seedDatabase()
  .catch((error) => {
    console.error("Seeding error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
