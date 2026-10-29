import type { Fuel, YearMonth } from './plate';

export interface CatalogueVersion {
  make: string;
  model: string;
  version: string;
  fuel: Fuel;
  displacement: number;
  power: number;
  /** First and last year the version was sold new. */
  from: number;
  to: number;
  /** Typical asking price in euros for an example first registered in `priceYear`. */
  priceYear: number;
  price: number;
}

type Row = [string, string, string, Fuel, number, number, number, number, number, number];

// Specs and price anchors from docs/plate-reference.md (sources and method), checked 2026-10-29.
const ROWS: readonly Row[] = [
  ['Fiat', '600', '600 D', 'Gasolina', 767, 25, 1960, 1969, 1969, 8000],
  ['Fiat', '127', '900', 'Gasolina', 903, 45, 1971, 1983, 1980, 6050],
  ['Citroën', '2CV', '2CV6', 'Gasolina', 602, 29, 1970, 1990, 1988, 13000],
  ['Renault', '4', 'GTL', 'Gasolina', 1108, 34, 1978, 1992, 1989, 3900],
  ['Renault', '5', '1.1 TL', 'Gasolina', 1108, 47, 1985, 1996, 1989, 1550],
  ['Fiat', 'Uno', '45 1.0 Fire', 'Gasolina', 999, 45, 1985, 1995, 1993, 1750],
  ['Citroën', 'AX', '1.1', 'Gasolina', 1124, 55, 1987, 1998, 1992, 2500],

  ['Renault', 'Clio', '1.2', 'Gasolina', 1149, 60, 1998, 2005, 2000, 1650],
  ['Renault', 'Clio', '1.5 dCi 90', 'Gasóleo', 1461, 90, 2013, 2019, 2015, 7250],
  ['Renault', 'Clio', '0.9 TCe 90', 'Gasolina', 898, 90, 2013, 2019, 2017, 9300],
  ['Renault', 'Clio', '1.0 TCe 100', 'Gasolina', 999, 100, 2019, 2022, 2022, 14500],
  ['Renault', 'Clio', '1.6 E-Tech Hybrid 140', 'Híbrido', 1598, 140, 2020, 2025, 2021, 15400],
  ['Renault', 'Mégane', '1.5 dCi 100', 'Gasóleo', 1461, 100, 2003, 2008, 2005, 5000],
  ['Renault', 'Mégane', '1.5 dCi 110', 'Gasóleo', 1461, 110, 2009, 2016, 2012, 6500],
  ['Renault', 'Mégane', '1.5 Blue dCi 115', 'Gasóleo', 1461, 115, 2018, 2023, 2022, 17300],
  ['Renault', 'Mégane', '1.3 TCe 140', 'Gasolina', 1332, 140, 2018, 2022, 2020, 14100],
  ['Renault', 'Mégane', '1.6 E-Tech Plug-in 160', 'Híbrido', 1598, 160, 2020, 2023, 2022, 18100],
  ['Renault', 'Captur', '0.9 TCe 90', 'Gasolina', 898, 90, 2013, 2019, 2016, 9250],
  ['Renault', 'Captur', '1.5 dCi 90', 'Gasóleo', 1461, 90, 2013, 2019, 2017, 11150],
  ['Renault', 'Captur', '1.0 TCe 100', 'Gasolina', 999, 100, 2020, 2021, 2020, 15500],
  ['Renault', 'Captur', '1.5 Blue dCi 115', 'Gasóleo', 1461, 115, 2019, 2021, 2021, 17500],
  ['Renault', 'Captur', '1.6 E-Tech Hybrid 145', 'Híbrido', 1598, 145, 2021, 2024, 2023, 20200],
  ['Dacia', 'Sandero', '1.2 16V 75', 'Gasolina', 1149, 75, 2008, 2012, 2011, 5950],
  ['Dacia', 'Sandero', '1.5 dCi 90', 'Gasóleo', 1461, 90, 2013, 2020, 2018, 10200],
  ['Dacia', 'Sandero', '0.9 TCe 90', 'Gasolina', 898, 90, 2013, 2020, 2017, 7800],
  ['Dacia', 'Sandero', '1.0 TCe 90', 'Gasolina', 999, 90, 2021, 2026, 2023, 14250],
  ['Dacia', 'Sandero', '1.0 SCe 65', 'Gasolina', 999, 65, 2021, 2026, 2025, 14050],

  ['Peugeot', '206', '1.1', 'Gasolina', 1124, 60, 1998, 2010, 2001, 1900],
  ['Peugeot', '206', '1.4 HDi', 'Gasóleo', 1398, 68, 2001, 2010, 2003, 2450],
  ['Peugeot', '207', '1.4 HDi', 'Gasóleo', 1398, 68, 2006, 2012, 2008, 3950],
  ['Peugeot', '208', '1.2 PureTech 82', 'Gasolina', 1199, 82, 2012, 2019, 2014, 6000],
  ['Peugeot', '208', '1.2 PureTech 100', 'Gasolina', 1199, 100, 2019, 2026, 2024, 14450],
  ['Peugeot', '208', '1.5 BlueHDi 100', 'Gasóleo', 1499, 100, 2019, 2024, 2023, 15850],
  ['Peugeot', '308', '1.6 HDi 110', 'Gasóleo', 1560, 110, 2007, 2013, 2010, 4000],
  ['Peugeot', '308', '1.2 PureTech 130', 'Gasolina', 1199, 130, 2014, 2021, 2017, 9200],
  ['Peugeot', '308', '1.5 BlueHDi 130', 'Gasóleo', 1499, 130, 2017, 2021, 2018, 9350],
  ['Peugeot', '308', '1.5 BlueHDi 130', 'Gasóleo', 1499, 130, 2022, 2026, 2024, 18800],
  ['Peugeot', '308', '1.6 Hybrid 180', 'Híbrido', 1598, 180, 2022, 2026, 2023, 20550],
  ['Peugeot', '2008', '1.2 PureTech 82', 'Gasolina', 1199, 82, 2013, 2019, 2018, 7500],
  ['Peugeot', '2008', '1.6 BlueHDi 100', 'Gasóleo', 1560, 100, 2015, 2019, 2015, 9700],
  ['Peugeot', '2008', '1.2 PureTech 130', 'Gasolina', 1199, 130, 2020, 2026, 2021, 16200],
  ['Peugeot', '2008', '1.5 BlueHDi 110', 'Gasóleo', 1499, 110, 2020, 2023, 2022, 15850],
  ['Peugeot', '2008', '1.2 Hybrid 145', 'Híbrido', 1199, 145, 2024, 2026, 2026, 24300],
  ['Citroën', 'C3', '1.1', 'Gasolina', 1124, 60, 2002, 2009, 2008, 3450],
  ['Citroën', 'C3', '1.4 HDi', 'Gasóleo', 1398, 68, 2009, 2016, 2014, 6450],
  ['Citroën', 'C3', '1.2 PureTech 82', 'Gasolina', 1199, 82, 2016, 2024, 2018, 8200],
  ['Citroën', 'C3', '1.2 PureTech 110', 'Gasolina', 1199, 110, 2017, 2023, 2021, 11900],
  ['Citroën', 'C3', '1.2 Hybrid 110', 'Híbrido', 1199, 110, 2025, 2026, 2025, 22000],
  ['Opel', 'Corsa', '1.3 CDTI 70', 'Gasóleo', 1248, 70, 2003, 2006, 2005, 3200],
  ['Opel', 'Corsa', '1.3 CDTI 75', 'Gasóleo', 1248, 75, 2006, 2014, 2009, 5000],
  ['Opel', 'Corsa', '1.2 Turbo 100', 'Gasolina', 1199, 100, 2019, 2026, 2023, 13150],
  ['Opel', 'Corsa', '1.5 D 100', 'Gasóleo', 1499, 100, 2020, 2023, 2023, 14950],
  ['Opel', 'Astra', '1.4 16V', 'Gasolina', 1389, 90, 1998, 2004, 1999, 2400],
  ['Opel', 'Astra', '1.3 CDTI 90', 'Gasóleo', 1248, 90, 2005, 2010, 2007, 2750],
  ['Opel', 'Astra', '1.7 CDTI 130', 'Gasóleo', 1686, 130, 2012, 2015, 2012, 6200],
  ['Opel', 'Astra', '1.6 CDTI 110', 'Gasóleo', 1598, 110, 2015, 2019, 2016, 6500],
  ['Opel', 'Astra', '1.2 Turbo 130', 'Gasolina', 1199, 130, 2022, 2026, 2025, 21950],
  ['Opel', 'Astra', '1.2 Hybrid 145', 'Híbrido', 1199, 145, 2025, 2026, 2026, 27450],
  ['Fiat', 'Punto', '1.2 16V 80', 'Gasolina', 1242, 80, 1999, 2010, 2000, 1550],
  ['Fiat', 'Punto', '1.3 Multijet 75', 'Gasóleo', 1248, 75, 2005, 2012, 2010, 3000],
  ['Fiat', 'Punto', '1.2 69', 'Gasolina', 1242, 69, 2012, 2018, 2015, 5550],
  ['Fiat', '500', '1.2 69', 'Gasolina', 1242, 69, 2008, 2020, 2014, 6350],
  ['Fiat', '500', '1.3 Multijet 95', 'Gasóleo', 1248, 95, 2010, 2016, 2013, 5900],
  ['Fiat', '500', '1.0 Hybrid 70', 'Híbrido', 999, 70, 2020, 2026, 2022, 11400],

  ['SEAT', 'Ibiza', '1.9 D', 'Gasóleo', 1896, 64, 1993, 1999, 1997, 1350],
  // The only observation was a €390 outlier; anchored on the Polo 1.2 of the same years instead.
  ['SEAT', 'Ibiza', '1.4 16V', 'Gasolina', 1390, 75, 2002, 2008, 2006, 2400],
  ['SEAT', 'Ibiza', '1.2 TDI', 'Gasóleo', 1199, 75, 2010, 2015, 2012, 6750],
  ['SEAT', 'Ibiza', '1.6 TDI', 'Gasóleo', 1598, 90, 2009, 2015, 2010, 7150],
  ['SEAT', 'Ibiza', '1.0 TSI', 'Gasolina', 999, 95, 2017, 2026, 2022, 14250],
  ['SEAT', 'Leon', '1.6 TDI', 'Gasóleo', 1598, 105, 2009, 2012, 2011, 6950],
  ['SEAT', 'Leon', '1.6 TDI', 'Gasóleo', 1598, 115, 2017, 2020, 2020, 16650],
  ['SEAT', 'Leon', '2.0 TDI', 'Gasóleo', 1968, 115, 2020, 2026, 2023, 19050],
  ['SEAT', 'Leon', '1.4 e-Hybrid', 'Híbrido', 1395, 204, 2020, 2024, 2021, 19000],
  ['Volkswagen', 'Polo', '1.4 TDI', 'Gasóleo', 1422, 75, 1999, 2001, 2000, 3250],
  ['Volkswagen', 'Polo', '1.2', 'Gasolina', 1198, 65, 2002, 2005, 2003, 1850],
  ['Volkswagen', 'Polo', '1.2 TDI', 'Gasóleo', 1199, 75, 2009, 2014, 2012, 5500],
  ['Volkswagen', 'Polo', '1.0 TSI', 'Gasolina', 999, 95, 2017, 2026, 2022, 14800],
  ['Volkswagen', 'Golf', '1.9 TDI', 'Gasóleo', 1896, 90, 1993, 1997, 1997, 4000],
  ['Volkswagen', 'Golf', '1.6 16V', 'Gasolina', 1598, 105, 2000, 2003, 2001, 2100],
  ['Volkswagen', 'Golf', '1.4 FSI', 'Gasolina', 1390, 90, 2003, 2008, 2005, 4650],
  ['Volkswagen', 'Golf', '2.0 TDI', 'Gasóleo', 1968, 150, 2012, 2020, 2013, 13400],
  ['Volkswagen', 'Golf', '1.4 eHybrid', 'Híbrido', 1395, 204, 2020, 2024, 2021, 26400],
  ['Volkswagen', 'Passat', '1.9 TDI', 'Gasóleo', 1896, 110, 1996, 2000, 1998, 1700],
  ['Volkswagen', 'Passat', '2.0 TDI', 'Gasóleo', 1968, 140, 2005, 2010, 2006, 4650],
  ['Volkswagen', 'Passat', '1.6 TDI', 'Gasóleo', 1598, 105, 2010, 2014, 2011, 8050],
  ['Volkswagen', 'Passat', '2.0 TDI', 'Gasóleo', 1968, 150, 2014, 2023, 2017, 11050],
  ['Volkswagen', 'Passat', '1.4 TSI GTE', 'Híbrido', 1395, 218, 2015, 2023, 2017, 16800],
  ['Audi', 'A3', '1.9 TDI', 'Gasóleo', 1896, 110, 1997, 2003, 2001, 3950],
  ['Audi', 'A3', '2.0 TDI', 'Gasóleo', 1968, 140, 2003, 2012, 2004, 5750],
  ['Audi', 'A3', '1.6 TDI', 'Gasóleo', 1598, 105, 2012, 2016, 2014, 14500],
  ['Audi', 'A3', '2.0 TDI', 'Gasóleo', 1968, 150, 2012, 2020, 2014, 16500],
  ['Audi', 'A3', '40 TFSI e', 'Híbrido', 1395, 204, 2020, 2024, 2024, 31900],
  ['Skoda', 'Octavia', '1.9 TDI', 'Gasóleo', 1896, 110, 1997, 2004, 1998, 2200],
  ['Skoda', 'Octavia', '2.0 TDI', 'Gasóleo', 1968, 140, 2004, 2010, 2008, 4100],
  ['Skoda', 'Octavia', '1.6 TDI', 'Gasóleo', 1598, 105, 2013, 2017, 2015, 12000],
  ['Skoda', 'Octavia', '2.0 TDI', 'Gasóleo', 1968, 116, 2020, 2026, 2022, 18950],
  ['Skoda', 'Octavia', '1.4 TSI iV', 'Híbrido', 1395, 204, 2020, 2024, 2021, 20000],
  ['BMW', 'Série 1', '116i', 'Gasolina', 1596, 115, 2004, 2007, 2005, 4750],
  ['BMW', 'Série 1', '118d', 'Gasóleo', 1995, 143, 2007, 2011, 2009, 9450],
  ['BMW', 'Série 1', '116d', 'Gasóleo', 1598, 116, 2012, 2015, 2014, 12250],
  ['BMW', 'Série 1', '118d', 'Gasóleo', 1995, 143, 2011, 2015, 2013, 14700],
  ['BMW', 'Série 1', '118i', 'Gasolina', 1499, 140, 2019, 2024, 2021, 20750],
  ['BMW', 'Série 3', '325 tds', 'Gasóleo', 2498, 143, 1993, 1998, 1993, 3000],
  ['BMW', 'Série 3', '320d', 'Gasóleo', 1995, 150, 2001, 2005, 2004, 5650],
  ['BMW', 'Série 3', '320d', 'Gasóleo', 1995, 184, 2012, 2015, 2013, 14700],
  ['BMW', 'Série 3', '320d', 'Gasóleo', 1995, 190, 2019, 2026, 2022, 30300],
  ['BMW', 'Série 3', '320e', 'Híbrido', 1998, 204, 2020, 2026, 2022, 27750],
  ['Mercedes-Benz', 'Classe A', 'A 180 CDI', 'Gasóleo', 1991, 109, 2004, 2012, 2011, 8850],
  ['Mercedes-Benz', 'Classe A', 'A 180 CDI', 'Gasóleo', 1461, 109, 2012, 2018, 2015, 13050],
  ['Mercedes-Benz', 'Classe A', 'A 180 CDI', 'Gasóleo', 1796, 109, 2012, 2015, 2013, 12900],
  ['Mercedes-Benz', 'Classe A', 'A 180 d', 'Gasóleo', 1461, 116, 2018, 2023, 2019, 21000],
  ['Mercedes-Benz', 'Classe A', 'A 180', 'Gasolina', 1332, 136, 2018, 2026, 2019, 20000],
  ['Mercedes-Benz', 'Classe C', 'C 220 CDI', 'Gasóleo', 2148, 143, 2000, 2003, 2002, 5450],
  ['Mercedes-Benz', 'Classe C', 'C 220 CDI', 'Gasóleo', 2143, 170, 2007, 2014, 2011, 9150],
  ['Mercedes-Benz', 'Classe C', 'C 220 d', 'Gasóleo', 2143, 170, 2014, 2018, 2016, 19400],
  ['Mercedes-Benz', 'Classe C', 'C 220 d', 'Gasóleo', 1950, 194, 2018, 2021, 2019, 26200],
  ['Mercedes-Benz', 'Classe C', 'C 220 d', 'Gasóleo', 1993, 200, 2021, 2026, 2024, 45600],

  ['Toyota', 'Yaris', '1.0 VVT-i', 'Gasolina', 998, 68, 1999, 2005, 2003, 3450],
  ['Toyota', 'Yaris', '1.4 D-4D', 'Gasóleo', 1364, 75, 2002, 2005, 2002, 4600],
  ['Toyota', 'Yaris', '1.4 D-4D', 'Gasóleo', 1364, 90, 2005, 2018, 2012, 7750],
  ['Toyota', 'Yaris', '1.5 Hybrid', 'Híbrido', 1497, 100, 2012, 2020, 2016, 14250],
  ['Toyota', 'Yaris', '1.5 Hybrid', 'Híbrido', 1490, 116, 2020, 2026, 2022, 20900],
  ['Toyota', 'Corolla', '1.3 XLi', 'Gasolina', 1331, 88, 1992, 1997, 1995, 3250],
  ['Toyota', 'Corolla', '1.4 VVT-i', 'Gasolina', 1398, 97, 2002, 2007, 2003, 3950],
  ['Toyota', 'Corolla', '1.8 Hybrid', 'Híbrido', 1798, 122, 2019, 2026, 2021, 20650],
  ['Toyota', 'Auris', '1.4 D-4D', 'Gasóleo', 1364, 90, 2007, 2018, 2010, 6400],
  ['Toyota', 'Auris', '1.8 Hybrid', 'Híbrido', 1798, 136, 2010, 2018, 2015, 11250],
  ['Toyota', 'C-HR', '1.8 Hybrid', 'Híbrido', 1798, 122, 2016, 2023, 2018, 19900],
  ['Toyota', 'C-HR', '2.0 Hybrid', 'Híbrido', 1987, 184, 2019, 2023, 2022, 28800],
  ['Toyota', 'C-HR', '1.8 Hybrid', 'Híbrido', 1798, 140, 2024, 2026, 2024, 34000],
  ['Nissan', 'Micra', '1.0', 'Gasolina', 998, 55, 1992, 2002, 1997, 1350],
  ['Nissan', 'Micra', '1.2', 'Gasolina', 1240, 80, 2003, 2010, 2007, 3450],
  ['Nissan', 'Micra', '1.2', 'Gasolina', 1198, 80, 2011, 2017, 2015, 7450],
  ['Nissan', 'Micra', '1.5 dCi', 'Gasóleo', 1461, 90, 2017, 2019, 2018, 10450],
  ['Nissan', 'Micra', '1.0 IG-T', 'Gasolina', 999, 100, 2019, 2023, 2020, 13200],
  ['Nissan', 'Qashqai', '1.5 dCi', 'Gasóleo', 1461, 106, 2007, 2013, 2011, 7350],
  ['Nissan', 'Qashqai', '1.6 dCi', 'Gasóleo', 1598, 130, 2011, 2018, 2015, 11050],
  ['Nissan', 'Qashqai', '1.5 dCi', 'Gasóleo', 1461, 110, 2014, 2018, 2016, 11800],
  ['Nissan', 'Qashqai', '1.2 DIG-T', 'Gasolina', 1197, 115, 2014, 2018, 2015, 10250],
  ['Nissan', 'Qashqai', '1.3 DIG-T', 'Gasolina', 1332, 140, 2021, 2026, 2024, 22350],
  ['Honda', 'Civic', '1.4i', 'Gasolina', 1396, 90, 1995, 2005, 2001, 2850],
  ['Honda', 'Civic', '1.7 CTDi', 'Gasóleo', 1686, 100, 2002, 2005, 2004, 2750],
  ['Honda', 'Civic', '1.4 i-DSi', 'Gasolina', 1339, 83, 2006, 2011, 2008, 4500],
  ['Honda', 'Civic', '1.6 i-DTEC', 'Gasóleo', 1597, 120, 2013, 2017, 2015, 10700],
  ['Honda', 'Civic', '1.0 VTEC Turbo', 'Gasolina', 988, 129, 2017, 2022, 2020, 18800],
  ['Mazda', '3', '1.6 MZ-CD', 'Gasóleo', 1560, 109, 2004, 2013, 2008, 3550],
  ['Mazda', '3', '1.5 Skyactiv-D', 'Gasóleo', 1499, 105, 2016, 2019, 2017, 11250],
  ['Mazda', '3', '2.0 Skyactiv-G', 'Gasolina', 1998, 122, 2019, 2026, 2019, 19400],
  ['Mazda', '3', '2.0 Skyactiv-X', 'Gasolina', 1998, 180, 2019, 2026, 2019, 18900],
  ['Kia', 'Ceed', '1.6 CRDi', 'Gasóleo', 1582, 115, 2007, 2012, 2010, 4200],
  ['Kia', 'Ceed', '1.4 CRDi', 'Gasóleo', 1396, 90, 2012, 2018, 2014, 10150],
  ['Kia', 'Ceed', '1.0 T-GDi', 'Gasolina', 998, 120, 2015, 2023, 2019, 13800],
  ['Kia', 'Ceed', '1.6 CRDi', 'Gasóleo', 1598, 136, 2018, 2021, 2019, 16650],
  ['Kia', 'Sportage', '2.0 TD', 'Gasóleo', 1998, 83, 1996, 2004, 2000, 4950],
  ['Kia', 'Sportage', '1.7 CRDi', 'Gasóleo', 1685, 115, 2010, 2018, 2015, 11300],
  ['Kia', 'Sportage', '1.6 GDi', 'Gasolina', 1591, 132, 2016, 2021, 2018, 14300],
  ['Kia', 'Sportage', '1.6 T-GDi', 'Gasolina', 1598, 150, 2022, 2026, 2024, 27050],
  ['Kia', 'Sportage', '1.6 T-GDi HEV', 'Híbrido', 1598, 230, 2022, 2026, 2024, 29800],
  ['Hyundai', 'i20', '1.2', 'Gasolina', 1248, 78, 2008, 2014, 2011, 4500],
  ['Hyundai', 'i20', '1.1 CRDi', 'Gasóleo', 1120, 75, 2012, 2018, 2016, 7350],
  ['Hyundai', 'i20', '1.0 T-GDi', 'Gasolina', 998, 100, 2016, 2020, 2019, 11900],
  ['Hyundai', 'i20', '1.2 MPi', 'Gasolina', 1197, 84, 2020, 2026, 2022, 14600],
  ['Hyundai', 'i20', '1.0 T-GDi', 'Gasolina', 998, 100, 2020, 2026, 2025, 18850],
  ['Hyundai', 'i30', '1.4 CVVT', 'Gasolina', 1396, 109, 2007, 2012, 2009, 3800],
  ['Hyundai', 'i30', '1.6 CRDi', 'Gasóleo', 1582, 110, 2012, 2018, 2017, 14250],
  ['Hyundai', 'i30', '1.6 CRDi', 'Gasóleo', 1598, 116, 2019, 2024, 2021, 14800],
  ['Hyundai', 'i30', '1.0 T-GDi', 'Gasolina', 998, 120, 2017, 2026, 2020, 14700],
  ['Ford', 'Fiesta', '1.8 D', 'Gasóleo', 1753, 60, 1996, 2002, 1996, 750],
  ['Ford', 'Fiesta', '1.25 Zetec', 'Gasolina', 1242, 75, 1996, 2008, 2005, 2650],
  ['Ford', 'Fiesta', '1.4 TDCi', 'Gasóleo', 1399, 68, 2002, 2012, 2010, 4250],
  ['Ford', 'Fiesta', '1.25', 'Gasolina', 1242, 82, 2008, 2017, 2010, 4950],
  ['Ford', 'Fiesta', '1.0 EcoBoost', 'Gasolina', 998, 100, 2013, 2023, 2018, 10850],
  ['Ford', 'Focus', '1.8 TDdi', 'Gasóleo', 1753, 90, 1999, 2004, 2003, 1400],
  ['Ford', 'Focus', '1.6 TDCi', 'Gasóleo', 1560, 90, 2004, 2011, 2009, 3900],
  ['Ford', 'Focus', '1.0 EcoBoost', 'Gasolina', 998, 125, 2012, 2018, 2014, 7150],
  ['Ford', 'Focus', '1.5 EcoBlue', 'Gasóleo', 1499, 120, 2018, 2025, 2019, 13250],
  ['Ford', 'Focus', '1.0 EcoBoost', 'Gasolina', 998, 125, 2018, 2025, 2022, 16200],
];

export const CATALOGUE: readonly CatalogueVersion[] = ROWS.map(
  ([make, model, version, fuel, displacement, power, from, to, priceYear, price]) => ({
    make,
    model,
    version,
    fuel,
    displacement,
    power,
    from,
    to,
    priceYear,
    price,
  })
);

export const FIRST_CATALOGUE_YEAR = Math.min(...CATALOGUE.map(({ from }) => from));

/** Year the observed asking prices were collected; ages are measured from it. */
export const PRICE_REFERENCE_YEAR = 2026;
/** Fitted yearly depreciation of asking prices (about 8 % a year). */
export const DEPRECIATION_RATE = 0.0856;
/** After this age asking prices stop falling, so older cars keep their anchor price. */
export const PRICE_FLOOR_AGE = 20;

/** Typical asking price for this version first registered in `year`, before rounding. */
export function typicalPrice(version: CatalogueVersion, { year }: YearMonth): number {
  const age = (y: number): number =>
    Math.min(Math.max(PRICE_REFERENCE_YEAR - y, 0), PRICE_FLOOR_AGE);
  return version.price * Math.exp(-DEPRECIATION_RATE * (age(year) - age(version.priceYear)));
}

export function vehicleName({ make, model, version }: CatalogueVersion): string {
  return `${make} ${model} ${version}`;
}
