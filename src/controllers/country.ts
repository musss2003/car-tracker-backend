import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { Country } from '../models/Country';

// Get all countries
export const getCountries = async (req: Request, res: Response) => {
  try {
    const countryRepository = AppDataSource.getRepository(Country);
    
    const countries = await countryRepository.find({
      select: ['id', 'name', 'code', 'flagUrl', 'callingCode'],
      order: { name: 'ASC' }
    });

    // Transform to match frontend interface
    const transformedCountries = countries.map(country => ({
      name: country.name,
      code: country.code,
      flag: country.flagUrl || `https://flagcdn.com/w20/${country.code.toLowerCase()}.png`,
      callingCode: country.callingCode || '+0'
    }));

    res.json(transformedCountries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : 'Something went wrong'
    });
  }
};