import { AppDataSource } from '../config/db';
import { Country } from '../models/Country';

interface RestCountryData {
  name: {
    common: string;
    official: string;
  };
  cca2: string;
  cca3: string;
  idd?: {
    root?: string;
    suffixes?: string[];
  };
  flags: {
    png: string;
    svg: string;
  };
}

const setupCountries = async () => {
  try {
    console.log('🔧 Initializing database connection...');
    
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    console.log('✅ Database connected successfully');

    // Create the countries table if it doesn't exist
    console.log('🔧 Creating countries table...');
    await AppDataSource.synchronize();
    console.log('✅ Countries table created/updated');

    // Check if countries already exist
    const countryRepository = AppDataSource.getRepository(Country);
    const existingCount = await countryRepository.count();
    
    if (existingCount > 0) {
      console.log(`ℹ️  Countries table already has ${existingCount} entries. Skipping seed.`);
      return;
    }

    console.log('📥 Fetching countries data from REST Countries API...');
    
    const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,cca3,idd,flags');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const countriesData: RestCountryData[] = await response.json();
    
    console.log(`📊 Processing ${countriesData.length} countries...`);
    
    const countries = countriesData.map(country => {
      const countryEntity = new Country();
      countryEntity.name = country.name.common;
      countryEntity.code = country.cca2;
      countryEntity.flagUrl = country.flags.png;
      
      // Handle calling code
      if (country.idd?.root && country.idd?.suffixes && country.idd.suffixes.length > 0) {
        countryEntity.callingCode = `${country.idd.root}${country.idd.suffixes[0]}`;
      } else {
        countryEntity.callingCode = '+0';
      }
      
      return countryEntity;
    });

    // Save countries in batches
    const batchSize = 50;
    let saved = 0;
    
    for (let i = 0; i < countries.length; i += batchSize) {
      const batch = countries.slice(i, i + batchSize);
      await countryRepository.save(batch);
      saved += batch.length;
      console.log(`💾 Saved ${saved}/${countries.length} countries...`);
    }
    
    console.log('✅ Countries setup completed successfully!');
    console.log(`📊 Total countries saved: ${saved}`);
    
  } catch (error) {
    console.error('❌ Error setting up countries:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
};

// Run the setup if this file is executed directly
if (require.main === module) {
  setupCountries()
    .then(() => {
      console.log('🎉 Countries setup script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Countries setup script failed:', error);
      process.exit(1);
    });
}

export default setupCountries;