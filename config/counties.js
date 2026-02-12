/**
 * Every county the site supports, keyed by state.
 * `subdomain` is the prefix used in https://{subdomain}.publicjailrecords.com/app/
 */

const COUNTIES = {
  Alabama: [
    { county: 'Autauga County', subdomain: 'autaugacountyal' },
    { county: 'Cherokee County', subdomain: 'cherokeecountyal' },
    { county: 'Escambia County', subdomain: 'escambiacountyal' },
    { county: 'Etowah County', subdomain: 'etowahcountyal' },
    { county: 'Franklin County', subdomain: 'franklincountyal' },
    { county: 'Jefferson County', subdomain: 'jeffersoncountyal' },
    { county: 'Marshall County', subdomain: 'marshallcountyal' },
    { county: 'Morgan County', subdomain: 'morgancountyal' },
    { county: 'St Clair County', subdomain: 'stclaircountyal' },
  ],
  Arizona: [
    { county: 'Greene County', subdomain: 'greenecountyaz' },
    { county: 'Yuma County', subdomain: 'myumacountyaz' },
  ],
  Arkansas: [
    { county: 'Baxter County', subdomain: 'baxtercountyar' },
    { county: 'Columbia County', subdomain: 'columbiacountyar' },
    { county: 'Jefferson County', subdomain: 'jeffersoncountyar' },
    { county: 'Mississippi County', subdomain: 'mississippicountyar' },
    { county: 'Poinsett County', subdomain: 'poinsettcountyar' },
  ],
  California: [
    { county: 'Mendocino County', subdomain: 'mendocinocountyca' },
    { county: 'Merced County', subdomain: 'mercedcountyca' },
  ],
  Florida: [
    { county: 'Flagler County', subdomain: 'flaglercountyfl' },
  ],
  Illinois: [
    { county: 'Kendall County', subdomain: 'kendallcountyil' },
    { county: 'Macon County', subdomain: 'maconcountyil' },
  ],
  Indiana: [
    { county: 'Madison County', subdomain: 'madisoncountyin' },
  ],
  Kansas: [
    { county: 'Bourbon County', subdomain: 'bourboncountyks' },
    { county: 'Geary County', subdomain: 'gearycountyks' },
    { county: 'Leavenworth County', subdomain: 'leavenworthcountyks' },
  ],
  Mississippi: [
    { county: 'Jones County', subdomain: 'jonescountyms' },
    { county: 'Kemper County', subdomain: 'kempercountyms' },
  ],
  Missouri: [
    { county: 'Andrew County', subdomain: 'andrewcountymo' },
    { county: 'Benton County', subdomain: 'bentoncountymo' },
    { county: 'Buchanan County', subdomain: 'buchanancountymo' },
    { county: 'Callaway County', subdomain: 'callawaycountymo' },
    { county: 'Camden County', subdomain: 'camdencountymo' },
    { county: 'Cape Girardeau County', subdomain: 'capegirardeaucountymo' },
    { county: 'Johnson County', subdomain: 'johnsoncountymo' },
  ],
  'New Mexico': [
    { county: 'San Juan County', subdomain: 'sanjuancountynm' },
  ],
  Ohio: [
    { county: 'Hancock County', subdomain: 'hancockcountyoh' },
    { county: 'Muskingum County', subdomain: 'muskingumcountyoh' },
  ],
  Texas: [
    { county: 'Bell County', subdomain: 'bellcountytx' },
    { county: 'Kendall County', subdomain: 'kendallcountytx' },
    { county: 'Tom Green County', subdomain: 'tomgreencountytx' },
  ],
  Virginia: [
    { county: 'Chesapeake', subdomain: 'chesapeakeva' },
  ],
  Wisconsin: [
    { county: 'Kenosha County', subdomain: 'kenoshacountywi' },
  ],
};

/* ── helper look-ups ── */

/** Flat list: [{ state, county, subdomain }, …] */
const FLAT_LIST = [];
for (const [state, counties] of Object.entries(COUNTIES)) {
  for (const c of counties) {
    FLAT_LIST.push({ state, county: c.county, subdomain: c.subdomain });
  }
}

/** All state names sorted */
const STATES = Object.keys(COUNTIES).sort();

/** Look up a county entry by subdomain */
function findBySubdomain(subdomain) {
  return FLAT_LIST.find((e) => e.subdomain === subdomain) ?? null;
}

/** Get counties for a given state */
function countiesForState(state) {
  return COUNTIES[state] ?? [];
}

module.exports = { COUNTIES, FLAT_LIST, STATES, findBySubdomain, countiesForState };
