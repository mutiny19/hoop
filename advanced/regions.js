/* Indiana region settings: every table the page draws from, in one file.
   Change these to make the page for another state or another convention; the pages read them as globals.
   Sources: OKI Mesh region list (docs.okimesh.org), the Visit Indiana regions map (visitindiana.in.gov/regions),
   IDHS district map, and the groups' own sites. Last reviewed October 2026. */

/* ---- County & district builder ---- */
const CODES = {Adams:"ada",Allen:"all",Bartholomew:"bar",Benton:"ben",Blackford:"bla",Boone:"boo",Brown:"bro",Carroll:"car",Cass:"cas",Clark:"clk",Clay:"cla",Clinton:"cli",Crawford:"cra",Daviess:"dav",DeKalb:"dek",Dearborn:"dea",Decatur:"dec",Delaware:"del",Dubois:"dub",Elkhart:"elk",Fayette:"fay",Floyd:"flo",Fountain:"fou",Franklin:"fra",Fulton:"ful",Gibson:"gib",Grant:"gra",Greene:"gre",Hamilton:"ham",Hancock:"han",Harrison:"har",Hendricks:"hen",Henry:"hry",Howard:"how",Huntington:"hun",Jackson:"jac",Jasper:"jas",Jay:"jay",Jefferson:"jef",Jennings:"jen",Johnson:"joh",Knox:"kno",Kosciusko:"kos",LaGrange:"lag",LaPorte:"lap",Lake:"lak",Lawrence:"law",Madison:"mad",Marion:"mrn",Marshall:"msh",Martin:"mtn",Miami:"mia",Monroe:"mon",Montgomery:"mgy",Morgan:"mor",Newton:"new",Noble:"nob",Ohio:"ohi",Orange:"ora",Owen:"owe",Parke:"par",Perry:"per",Pike:"pik",Porter:"por",Posey:"pos",Pulaski:"pul",Putnam:"put",Randolph:"ran",Ripley:"rip",Rush:"rus",Scott:"sco",Shelby:"she",Spencer:"spe","St. Joseph":"stj",Starke:"sta",Steuben:"ste",Sullivan:"sul",Switzerland:"swi",Tippecanoe:"tpc",Tipton:"tip",Union:"uni",Vanderburgh:"van",Vermillion:"ver",Vigo:"vig",Wabash:"wab",Warren:"wrn",Warrick:"wrk",Washington:"was",Wayne:"way",Wells:"wel",White:"whi",Whitley:"wht"};

const DISTRICTS = {
  nw:  {n:1,  name:"Northwest",     c:["Jasper","Lake","LaPorte","Newton","Porter"]},
  nc:  {n:2,  name:"North Central", c:["Elkhart","Fulton","Kosciusko","Marshall","Pulaski","St. Joseph","Starke"]},
  ne:  {n:3,  name:"Northeast",     c:["Adams","Allen","DeKalb","Huntington","LaGrange","Miami","Noble","Steuben","Wabash","Wells","Whitley"]},
  wc:  {n:4,  name:"West Central",  c:["Benton","Carroll","Cass","Clinton","Fountain","Montgomery","Tippecanoe","Warren","White"]},
  cen: {n:5,  name:"Central",       c:["Boone","Hamilton","Hancock","Hendricks","Johnson","Marion","Morgan","Shelby"]},
  ec:  {n:6,  name:"East Central",  c:["Blackford","Delaware","Fayette","Grant","Henry","Howard","Jay","Madison","Randolph","Rush","Tipton","Union","Wayne"]},
  w:   {n:7,  name:"West",          c:["Clay","Greene","Owen","Parke","Putnam","Sullivan","Vermillion","Vigo"]},
  sc:  {n:8,  name:"South Central", c:["Bartholomew","Brown","Jackson","Lawrence","Monroe","Orange","Washington"]},
  se:  {n:9,  name:"Southeast",     c:["Clark","Dearborn","Decatur","Floyd","Franklin","Harrison","Jefferson","Jennings","Ohio","Ripley","Scott","Switzerland"]},
  sw:  {n:10, name:"Southwest",     c:["Crawford","Daviess","Dubois","Gibson","Knox","Martin","Perry","Pike","Posey","Spencer","Vanderburgh","Warrick"]},
};

const OKI_METRO = {
  "IN:Marion":"ind","IN:Hamilton":"ind","IN:Hendricks":"ind","IN:Johnson":"ind","IN:Hancock":"ind","IN:Boone":"ind","IN:Madison":"ind","IN:Morgan":"ind","IN:Shelby":"ind","IN:Putnam":"ind","IN:Brown":"ind",
  "IN:Allen":"fwa","IN:Whitley":"fwa","IN:Wells":"fwa",
  "IN:Clark":"sdf","IN:Floyd":"sdf","IN:Harrison":"sdf","IN:Scott":"sdf","IN:Washington":"sdf",
  "IN:Dearborn":"cvg","IN:Franklin":"cvg","IN:Ohio":"cvg","IN:Union":"cvg",
  "OH:Hamilton":"cvg","OH:Butler":"cvg","KY:Boone":"cvg","KY:Gallatin":"cvg",
  "KY:Jefferson":"sdf","KY:Oldham":"sdf","KY:Trimble":"sdf","KY:Meade":"sdf","KY:Hardin":"sdf",
};

const STATE_TAG = {IN:"us-in", OH:"us-oh", KY:"us-ky", IL:"us-il", MI:"us-mi"};

/* ---- Abbreviated and Simplest modes ---- */
var METROS = [
  { code: "ind", name: "Indianapolis", pub: true }, { code: "fwa", name: "Fort Wayne", pub: true },
  { code: "sbn", name: "South Bend", pub: true }, { code: "evv", name: "Evansville", pub: true },
  { code: "laf", name: "Lafayette" }, { code: "bmg", name: "Bloomington" }, { code: "huf", name: "Terre Haute" },
  { code: "mie", name: "Muncie" }, { code: "gyy", name: "Gary / NW Indiana" },
  { code: "cvg", name: "Cincinnati side (SE Indiana)", pub: true }, { code: "sdf", name: "Louisville side (S Indiana)", pub: true }
];

var NEIGHBORS = [
  { code: "oki", name: "OKI Mesh (Cincinnati tri-state)" }, { code: "us-midwest", name: "OKI meta region" },
  { code: "mi", name: "MichMesh Michigan" }, { code: "midwest", name: "MichMesh meta region" },
  { code: "nei", name: "NEIMesh northeast Indiana" }, { code: "us-oh", name: "Ohio" }, { code: "us-ky", name: "Kentucky" },
  { code: "us-il", name: "Illinois", pub: false }, { code: "us-mi", name: "Michigan", pub: false }
];

var PLACES = {
  ind: { cities: ["Indianapolis", "Indy", "Carmel", "Fishers", "Noblesville", "Greenwood", "Avon", "Plainfield"], counties: ["Marion", "Hamilton", "Hendricks", "Johnson", "Hancock", "Boone", "Morgan", "Shelby", "Madison", "Putnam", "Brown"] },
  fwa: { cities: ["Fort Wayne", "New Haven", "Huntertown"], counties: ["Allen", "Whitley", "Wells", "Huntington", "DeKalb"] },
  sbn: { cities: ["South Bend", "Mishawaka", "Elkhart", "Goshen"], counties: ["St. Joseph", "Elkhart", "Marshall"] },
  evv: { cities: ["Evansville", "Newburgh", "Princeton"], counties: ["Vanderburgh", "Warrick", "Posey", "Gibson"] },
  laf: { cities: ["Lafayette", "West Lafayette"], counties: ["Tippecanoe", "Benton", "Carroll", "Warren", "Clinton"] },
  bmg: { cities: ["Bloomington"], counties: ["Monroe", "Owen", "Greene", "Lawrence"] },
  huf: { cities: ["Terre Haute"], counties: ["Vigo", "Clay", "Sullivan", "Vermillion", "Parke"] },
  mie: { cities: ["Muncie"], counties: ["Delaware", "Jay", "Randolph", "Blackford"] },
  gyy: { cities: ["Gary", "Hammond", "Merrillville", "Valparaiso", "Crown Point", "Michigan City"], counties: ["Lake", "Porter", "LaPorte", "Jasper", "Newton"] },
  cvg: { cities: ["Lawrenceburg", "Aurora", "Batesville", "Brookville"], counties: ["Dearborn", "Franklin", "Ohio", "Union"] },
  sdf: { cities: ["Jeffersonville", "New Albany", "Clarksville", "Sellersburg", "Corydon"], counties: ["Clark", "Floyd", "Harrison", "Scott", "Washington"] }
};

/* The eleven regions of the Visit Indiana map (visitindiana.in.gov/regions), county lists from each region's page, Oct 2026. */
var REGIONS = [
  { k: "nw",  n: 1,  name: "Northwest",     c: ["Jasper", "Lake", "LaPorte", "Newton", "Porter"] },
  { k: "nc",  n: 2,  name: "North Central", c: ["Elkhart", "Fulton", "Marshall", "Pulaski", "St. Joseph", "Starke"] },
  { k: "ne",  n: 3,  name: "Northeast",     c: ["Adams", "Allen", "DeKalb", "Huntington", "Kosciusko", "LaGrange", "Noble", "Steuben", "Wabash", "Wells", "Whitley"] },
  { k: "wv",  n: 4,  name: "Wabash Valley", c: ["Benton", "Carroll", "Cass", "Clinton", "Miami", "Tippecanoe", "Warren", "White"] },
  { k: "wc",  n: 5,  name: "West-Central",  c: ["Clay", "Fountain", "Montgomery", "Parke", "Putnam", "Sullivan", "Vermillion", "Vigo"] },
  { k: "cen", n: 6,  name: "Central",       c: ["Boone", "Hamilton", "Hancock", "Hendricks", "Johnson", "Marion", "Morgan", "Shelby"] },
  { k: "ec",  n: 7,  name: "East Central",  c: ["Blackford", "Delaware", "Fayette", "Grant", "Henry", "Howard", "Jay", "Madison", "Randolph", "Rush", "Tipton", "Wayne"] },
  { k: "sc",  n: 8,  name: "South Central", c: ["Bartholomew", "Brown", "Greene", "Jackson", "Lawrence", "Monroe", "Owen"] },
  { k: "sw",  n: 9,  name: "Southwest",     c: ["Daviess", "Dubois", "Gibson", "Knox", "Martin", "Pike", "Posey", "Spencer", "Vanderburgh", "Warrick"] },
  { k: "se",  n: 10, name: "Southeast",     c: ["Dearborn", "Decatur", "Franklin", "Jefferson", "Jennings", "Ohio", "Ripley", "Switzerland", "Union"] },
  { k: "s",   n: 11, name: "South",         c: ["Clark", "Crawford", "Floyd", "Harrison", "Orange", "Perry", "Scott", "Washington"] }
];

/* Simplest mode: one airport, one third of the state (a shorthand for Visit Indiana regions). */
var BANDS = [
  { key: "north", name: "Northern Indiana", tag: "us-in-north", regions: ["Northwest", "North Central", "Northeast", "Wabash Valley"] },
  { key: "central", name: "Central Indiana", tag: "us-in-central", regions: ["West-Central", "Central", "East Central"] },
  { key: "south", name: "Southern Indiana", tag: "us-in-south", regions: ["South Central", "Southwest", "Southeast", "South"] }
];
