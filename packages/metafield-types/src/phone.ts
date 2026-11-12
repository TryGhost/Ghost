import type { CountryCode } from './countries.ts';

/**
 * The calling code of each country a phone number can belong to, without its +.
 *
 * Copied from libphonenumber-js's metadata, which the package's tests check it against, so a
 * browser app can offer a member their country's code without loading the rules that need the
 * whole library. A country nobody dials, such as Antarctica, has none.
 */
export const CALLING_CODES = {
  AC: '247',
  AD: '376',
  AE: '971',
  AF: '93',
  AG: '1',
  AI: '1',
  AL: '355',
  AM: '374',
  AO: '244',
  AR: '54',
  AS: '1',
  AT: '43',
  AU: '61',
  AW: '297',
  AX: '358',
  AZ: '994',
  BA: '387',
  BB: '1',
  BD: '880',
  BE: '32',
  BF: '226',
  BG: '359',
  BH: '973',
  BI: '257',
  BJ: '229',
  BL: '590',
  BM: '1',
  BN: '673',
  BO: '591',
  BQ: '599',
  BR: '55',
  BS: '1',
  BT: '975',
  BW: '267',
  BY: '375',
  BZ: '501',
  CA: '1',
  CC: '61',
  CD: '243',
  CF: '236',
  CG: '242',
  CH: '41',
  CI: '225',
  CK: '682',
  CL: '56',
  CM: '237',
  CN: '86',
  CO: '57',
  CR: '506',
  CU: '53',
  CV: '238',
  CW: '599',
  CX: '61',
  CY: '357',
  CZ: '420',
  DE: '49',
  DJ: '253',
  DK: '45',
  DM: '1',
  DO: '1',
  DZ: '213',
  EC: '593',
  EE: '372',
  EG: '20',
  EH: '212',
  ER: '291',
  ES: '34',
  ET: '251',
  FI: '358',
  FJ: '679',
  FK: '500',
  FM: '691',
  FO: '298',
  FR: '33',
  GA: '241',
  GB: '44',
  GD: '1',
  GE: '995',
  GF: '594',
  GG: '44',
  GH: '233',
  GI: '350',
  GL: '299',
  GM: '220',
  GN: '224',
  GP: '590',
  GQ: '240',
  GR: '30',
  GT: '502',
  GU: '1',
  GW: '245',
  GY: '592',
  HK: '852',
  HN: '504',
  HR: '385',
  HT: '509',
  HU: '36',
  ID: '62',
  IE: '353',
  IL: '972',
  IM: '44',
  IN: '91',
  IO: '246',
  IQ: '964',
  IR: '98',
  IS: '354',
  IT: '39',
  JE: '44',
  JM: '1',
  JO: '962',
  JP: '81',
  KE: '254',
  KG: '996',
  KH: '855',
  KI: '686',
  KM: '269',
  KN: '1',
  KP: '850',
  KR: '82',
  KW: '965',
  KY: '1',
  KZ: '7',
  LA: '856',
  LB: '961',
  LC: '1',
  LI: '423',
  LK: '94',
  LR: '231',
  LS: '266',
  LT: '370',
  LU: '352',
  LV: '371',
  LY: '218',
  MA: '212',
  MC: '377',
  MD: '373',
  ME: '382',
  MF: '590',
  MG: '261',
  MH: '692',
  MK: '389',
  ML: '223',
  MM: '95',
  MN: '976',
  MO: '853',
  MP: '1',
  MQ: '596',
  MR: '222',
  MS: '1',
  MT: '356',
  MU: '230',
  MV: '960',
  MW: '265',
  MX: '52',
  MY: '60',
  MZ: '258',
  NA: '264',
  NC: '687',
  NE: '227',
  NF: '672',
  NG: '234',
  NI: '505',
  NL: '31',
  NO: '47',
  NP: '977',
  NR: '674',
  NU: '683',
  NZ: '64',
  OM: '968',
  PA: '507',
  PE: '51',
  PF: '689',
  PG: '675',
  PH: '63',
  PK: '92',
  PL: '48',
  PM: '508',
  PR: '1',
  PS: '970',
  PT: '351',
  PW: '680',
  PY: '595',
  QA: '974',
  RE: '262',
  RO: '40',
  RS: '381',
  RU: '7',
  RW: '250',
  SA: '966',
  SB: '677',
  SC: '248',
  SD: '249',
  SE: '46',
  SG: '65',
  SH: '290',
  SI: '386',
  SJ: '47',
  SK: '421',
  SL: '232',
  SM: '378',
  SN: '221',
  SO: '252',
  SR: '597',
  SS: '211',
  ST: '239',
  SV: '503',
  SX: '1',
  SY: '963',
  SZ: '268',
  TA: '290',
  TC: '1',
  TD: '235',
  TG: '228',
  TH: '66',
  TJ: '992',
  TK: '690',
  TL: '670',
  TM: '993',
  TN: '216',
  TO: '676',
  TR: '90',
  TT: '1',
  TV: '688',
  TW: '886',
  TZ: '255',
  UA: '380',
  UG: '256',
  US: '1',
  UY: '598',
  UZ: '998',
  VA: '39',
  VC: '1',
  VE: '58',
  VG: '1',
  VI: '1',
  VN: '84',
  VU: '678',
  WF: '681',
  WS: '685',
  XK: '383',
  YE: '967',
  YT: '262',
  ZA: '27',
  ZM: '260',
  ZW: '263',
} as const satisfies { readonly [C in CountryCode]?: string };

/** A country a phone number can belong to: one with a calling code. */
export type PhoneCountry = keyof typeof CALLING_CODES;

export function isPhoneCountry(code: string): code is PhoneCountry {
  return Object.prototype.hasOwnProperty.call(CALLING_CODES, code);
}

/**
 * What each country dials before a calling code to call abroad, as a pattern: `00` in most, `011`
 * in the US and Canada. Copied from libphonenumber-js's metadata, which the package's tests check it
 * against, so a number written the way its country dials abroad is read as one with its code.
 */
export const INTERNATIONAL_PREFIXES: { readonly [C in PhoneCountry]: string } = {
  AC: '00',
  AD: '00',
  AE: '00',
  AF: '00',
  AG: '011',
  AI: '011',
  AL: '00',
  AM: '00',
  AO: '00',
  AR: '00',
  AS: '011',
  AT: '00',
  AU: '001[14-689]|14(?:1[14]|34|4[17]|[56]6|7[47]|88)0011',
  AW: '00',
  AX: '00|99(?:[01469]|5(?:[14]1|3[23]|5[59]|77|88|9[09]))',
  AZ: '00',
  BA: '00',
  BB: '011',
  BD: '00',
  BE: '00',
  BF: '00',
  BG: '00',
  BH: '00',
  BI: '00',
  BJ: '00',
  BL: '00',
  BM: '011',
  BN: '00',
  BO: '00(?:1\\d)?',
  BQ: '00',
  BR: '00(?:1[245]|2[1-35]|31|4[13]|[56]5|99)',
  BS: '011',
  BT: '00',
  BW: '00',
  BY: '810',
  BZ: '00',
  CA: '011',
  CC: '001[14-689]|14(?:1[14]|34|4[17]|[56]6|7[47]|88)0011',
  CD: '00',
  CF: '00',
  CG: '00',
  CH: '00',
  CI: '00',
  CK: '00',
  CL: '(?:0|1(?:1[0-69]|2[02-5]|5[13-58]|69|7[0167]|8[018]))0',
  CM: '00',
  CN: '00|1(?:[12]\\d|79)\\d\\d00',
  CO: '00(?:4(?:[14]4|56)|[579])',
  CR: '00',
  CU: '119',
  CV: '0',
  CW: '00',
  CX: '001[14-689]|14(?:1[14]|34|4[17]|[56]6|7[47]|88)0011',
  CY: '00',
  CZ: '00',
  DE: '00',
  DJ: '00',
  DK: '00',
  DM: '011',
  DO: '011',
  DZ: '00',
  EC: '00',
  EE: '00',
  EG: '00',
  EH: '00',
  ER: '00',
  ES: '00',
  ET: '00',
  FI: '00|99(?:[01469]|5(?:[14]1|3[23]|5[59]|77|88|9[09]))',
  FJ: '0(?:0|52)',
  FK: '00',
  FM: '00',
  FO: '00',
  FR: '00',
  GA: '00',
  GB: '00',
  GD: '011',
  GE: '00',
  GF: '00',
  GG: '00',
  GH: '00',
  GI: '00',
  GL: '00',
  GM: '00',
  GN: '00',
  GP: '00',
  GQ: '00',
  GR: '00',
  GT: '00',
  GU: '011',
  GW: '00',
  GY: '001',
  HK: '00(?:30|5[09]|[126-9]?)',
  HN: '00',
  HR: '00',
  HT: '00',
  HU: '00',
  ID: '00[89]',
  IE: '00',
  IL: '0(?:0|1(?:05|[2-9]))',
  IM: '00',
  IN: '00',
  IO: '00',
  IQ: '00',
  IR: '00',
  IS: '00|1(?:0(?:01|[12]0)|100)',
  IT: '00',
  JE: '00',
  JM: '011',
  JO: '00',
  JP: '010',
  KE: '000',
  KG: '00',
  KH: '00[14-9]',
  KI: '00',
  KM: '00',
  KN: '011',
  KP: '00|99',
  KR: '00(?:[125689]|3(?:[46]5|91)|7(?:00|27|3|55|6[126]))',
  KW: '00',
  KY: '011',
  KZ: '810',
  LA: '00',
  LB: '00',
  LC: '011',
  LI: '00',
  LK: '00',
  LR: '00',
  LS: '00',
  LT: '00',
  LU: '00',
  LV: '00',
  LY: '00',
  MA: '00',
  MC: '00',
  MD: '00',
  ME: '00',
  MF: '00',
  MG: '00',
  MH: '011',
  MK: '00',
  ML: '00',
  MM: '00',
  MN: '001',
  MO: '00',
  MP: '011',
  MQ: '00',
  MR: '00',
  MS: '011',
  MT: '00',
  MU: '0(?:0|[24-7]0|3[03])',
  MV: '0(?:0|19)',
  MW: '00',
  MX: '0[09]',
  MY: '00',
  MZ: '00',
  NA: '00',
  NC: '00',
  NE: '00',
  NF: '00',
  NG: '009',
  NI: '00',
  NL: '00',
  NO: '00',
  NP: '00',
  NR: '00',
  NU: '00',
  NZ: '0(?:0|161)',
  OM: '00',
  PA: '00',
  PE: '00|19(?:1[124]|77|90)00',
  PF: '00',
  PG: '00|140[1-3]',
  PH: '00',
  PK: '00',
  PL: '00',
  PM: '00',
  PR: '011',
  PS: '00',
  PT: '00',
  PW: '01[12]',
  PY: '00',
  QA: '00',
  RE: '00',
  RO: '00',
  RS: '00',
  RU: '810',
  RW: '00',
  SA: '00',
  SB: '0[01]',
  SC: '010|0[0-2]',
  SD: '00',
  SE: '00',
  SG: '0[0-3]\\d',
  SH: '00',
  SI: '00|10(?:22|66|88|99)',
  SJ: '00',
  SK: '00',
  SL: '00',
  SM: '00',
  SN: '00',
  SO: '00',
  SR: '00',
  SS: '00',
  ST: '00',
  SV: '00',
  SX: '011',
  SY: '00',
  SZ: '00',
  TA: '00',
  TC: '011',
  TD: '00|16',
  TG: '00',
  TH: '00[1-9]',
  TJ: '810',
  TK: '00',
  TL: '00',
  TM: '810',
  TN: '00',
  TO: '00',
  TR: '00',
  TT: '011',
  TV: '00',
  TW: '0(?:0[25-79]|19)',
  TZ: '00[056]',
  UA: '00',
  UG: '00[057]',
  US: '011',
  UY: '0(?:0|1[3-9]\\d)',
  UZ: '00',
  VA: '00',
  VC: '011',
  VE: '00',
  VG: '011',
  VI: '011',
  VN: '00',
  VU: '00',
  WF: '00',
  WS: '0',
  XK: '00',
  YE: '00',
  YT: '00',
  ZA: '00',
  ZM: '00',
  ZW: '00',
};

/**
 * What places a number in one of the countries sharing its calling code, as libphonenumber-js
 * places it with its smallest metadata: the leading digits of every number the country gives out,
 * or where it has none, the pattern its numbers fit and those of each kind it gives out, such as
 * mobile or fixed line.
 */
type NumberingPlan =
  | { readonly country: PhoneCountry; readonly leading: string }
  | {
      readonly country: PhoneCountry;
      readonly general: string;
      readonly numbers: readonly string[];
    };

/**
 * The countries sharing each calling code several countries share, in libphonenumber-js's order,
 * the code's main country first, each with what places a number in it. Copied from the library's
 * smallest metadata, which the package's tests check it against, so a browser app can show the
 * country a number is from, such as Canada for a Toronto number, without loading the library.
 */
export const SHARED_CODES: { readonly [callingCode: string]: readonly NumberingPlan[] } = {
  '1': [
    {
      country: 'US',
      general: '[2-9]\\d{9}|3\\d{6}',
      numbers: [
        '983[2-57-9]\\d{6}|(?:2(?:0[1-35-9]|1[02-9]|2[03-57-9]|3[1459]|4[08]|5[1-46]|6[0279]|7[02469]|8[13])|3(?:0[1-57-9]|1[02-9]|2[013-79]|3[0-24679]|4[167]|5[0-3]|6[01349]|8[056])|4(?:0[124-9]|1[02-579]|2[3-5]|3[0245]|4[023578]|58|6[349]|7[02589]|8[04])|5(?:0[1-57-9]|1[0235-8]|20|3[0149]|4[01]|5[179]|6[1-47]|7[0-5]|8[0256])|6(?:0[1-35-9]|1[024-9]|2[03689]|3[016]|4[0156]|5[01679]|6[0-279]|78|8[0-269])|7(?:0[1-46-8]|1[2-9]|2[04-8]|3[0-2478]|4[0378]|5[47]|6[02359]|7[0-59]|8[156])|8(?:0[1-68]|1[02-8]|2[0168]|3[0-2589]|4[03578]|5[046-9]|6[02-5]|7[028])|9(?:0[1346-9]|1[02-9]|2[0589]|3[0146-8]|4[01357-9]|5[12469]|7[0-3589]|8[04-69]))[2-9]\\d{6}',
        '',
        '8(?:00|33|44|55|66|77|88)[2-9]\\d{6}',
        '900[2-9]\\d{6}',
        '52(?:3(?:[2-46-9][02-9]\\d|5(?:[02-46-9]\\d|5[0-46-9]))|4(?:[2-478][02-9]\\d|5(?:[034]\\d|2[024-9]|5[0-46-9])|6(?:0[1-9]|[2-9]\\d)|9(?:[05-9]\\d|2[0-5]|49)))\\d{4}|52[34][2-9]1[02-9]\\d{4}|5(?:00|2[125-9]|3[23]|44|66|77|88)[2-9]\\d{6}',
      ],
    },
    { country: 'AG', leading: '268' },
    { country: 'AI', leading: '264' },
    { country: 'AS', leading: '684' },
    { country: 'BB', leading: '246' },
    { country: 'BM', leading: '441' },
    { country: 'BS', leading: '242' },
    {
      country: 'CA',
      general: '[2-9]\\d{9}|3\\d{6}',
      numbers: [
        '(?:2(?:04|[23]6|[48]9|5[07]|[67]3)|3(?:06|43|54|6[578]|82)|4(?:03|1[68]|[26]8|3[178]|50|74)|5(?:06|1[49]|48|79|8[147])|6(?:04|[18]3|39|47|72)|7(?:0[59]|42|53|78|8[02])|8(?:[06]7|19|25|7[39])|9(?:0[25]|42))[2-9]\\d{6}',
        '',
        '8(?:00|33|44|55|66|77|88)[2-9]\\d{6}',
        '900[2-9]\\d{6}',
        '52(?:3(?:[2-46-9][02-9]\\d|5(?:[02-46-9]\\d|5[0-46-9]))|4(?:[2-478][02-9]\\d|5(?:[034]\\d|2[024-9]|5[0-46-9])|6(?:0[1-9]|[2-9]\\d)|9(?:[05-9]\\d|2[0-5]|49)))\\d{4}|52[34][2-9]1[02-9]\\d{4}|(?:5(?:2[125-9]|3[23]|44|66|77|88)|6(?:22|33))[2-9]\\d{6}',
        '310\\d{4}',
        '600[2-9]\\d{6}',
      ],
    },
    { country: 'DM', leading: '767' },
    { country: 'DO', leading: '8001|8[024]9' },
    { country: 'GD', leading: '473' },
    { country: 'GU', leading: '671' },
    { country: 'JM', leading: '658|876' },
    { country: 'KN', leading: '869' },
    { country: 'KY', leading: '345' },
    { country: 'LC', leading: '758' },
    { country: 'MP', leading: '670' },
    { country: 'MS', leading: '664' },
    { country: 'PR', leading: '787|939' },
    { country: 'SX', leading: '721' },
    { country: 'TC', leading: '649' },
    { country: 'TT', leading: '868' },
    { country: 'VC', leading: '784' },
    { country: 'VG', leading: '284' },
    { country: 'VI', leading: '340' },
  ],
  '7': [
    { country: 'RU', leading: '[3489]' },
    { country: 'KZ', leading: '7' },
  ],
  '39': [
    {
      country: 'IT',
      general:
        '0\\d{5,11}|1\\d{8,10}|3(?:[0-8]\\d{7,10}|9\\d{7,8})|(?:43|55|70)\\d{8}|8\\d{5}(?:\\d{2,4})?',
      numbers: [
        '0(?:669[0-79]\\d{1,6}|831\\d{2,8})|0(?:1(?:[0159]\\d|[27][1-5]|31|4[1-4]|6[1356]|8[2-57])|2\\d\\d|3(?:[0159]\\d|2[1-4]|3[12]|[48][1-6]|6[2-59]|7[1-7])|4(?:[0159]\\d|[23][1-9]|4[245]|6[1-5]|7[1-4]|81)|5(?:[0159]\\d|2[1-5]|3[2-6]|4[1-79]|6[4-6]|7[1-578]|8[3-8])|6(?:[0-57-9]\\d|6[0-8])|7(?:[0159]\\d|2[12]|3[1-7]|4[2-46]|6[13569]|7[13-6]|8[1-59])|8(?:[0159]\\d|2[3-578]|3[2356]|[6-8][1-5])|9(?:[0159]\\d|[238][1-5]|4[12]|6[1-8]|7[1-6]))\\d{2,7}',
        '3[2-9]\\d{7,8}|(?:31|43)\\d{8}',
        '80(?:0\\d{3}|3)\\d{3}',
        '(?:0878\\d{3}|89(?:2\\d|3[04]|4(?:[0-4]|[5-9]\\d\\d)|5[0-4]))\\d\\d|(?:1(?:44|6[346])|89(?:38|5[5-9]|9))\\d{6}',
        '1(?:78\\d|99)\\d{6}',
        '3[2-8]\\d{9,10}',
        '55\\d{8}',
        '84(?:[08]\\d{3}|[17])\\d{3}',
      ],
    },
    { country: 'VA', leading: '06698' },
  ],
  '44': [
    {
      country: 'GB',
      general: '[1-357-9]\\d{9}|[18]\\d{8}|8\\d{6}',
      numbers: [
        '(?:1(?:1(?:3(?:[0-58]\\d\\d|73[0-5])|4(?:(?:[0-5]\\d|70)\\d|69[7-9])|(?:(?:5[0-26-9]|[78][0-49])\\d|6(?:[0-4]\\d|5[01]))\\d)|(?:2(?:(?:0[024-9]|2[3-9]|3[3-79]|4[1-689]|[58][02-9]|6[0-47-9]|7[013-9]|9\\d)\\d|1(?:[0-7]\\d|8[0-3]))|(?:3(?:0\\d|1[0-8]|[25][02-9]|3[02-579]|[468][0-46-9]|7[1-35-79]|9[2-578])|4(?:0[03-9]|[137]\\d|[28][02-57-9]|4[02-69]|5[0-8]|[69][0-79])|5(?:0[1-35-9]|[16]\\d|2[024-9]|3[015689]|4[02-9]|5[03-9]|7[0-35-9]|8[0-468]|9[0-57-9])|6(?:0[034689]|1\\d|2[0-35689]|[38][013-9]|4[1-467]|5[0-69]|6[13-9]|7[0-8]|9[0-24578])|7(?:0[0246-9]|2\\d|3[0236-8]|4[03-9]|5[0-46-9]|6[013-9]|7[0-35-9]|8[024-9]|9[02-9])|8(?:0[35-9]|2[1-57-9]|3[02-578]|4[0-578]|5[124-9]|6[2-69]|7\\d|8[02-9]|9[02569])|9(?:0[02-589]|[18]\\d|2[02-689]|3[1-57-9]|4[2-9]|5[0-579]|6[2-47-9]|7[0-24578]|9[2-57]))\\d)\\d)|2(?:0[013478]|3[0189]|4[017]|8[0-46-9]|9[0-2])\\d{3})\\d{4}|1(?:2(?:0(?:46[1-4]|87[2-9])|545[1-79]|76(?:2\\d|3[1-8]|6[1-6])|9(?:7(?:2[0-4]|3[2-5])|8(?:2[2-8]|7[0-47-9]|8[3-5])))|3(?:6(?:38[2-5]|47[23])|8(?:47[04-9]|64[0157-9]))|4(?:044[1-7]|20(?:2[23]|8\\d)|6(?:0(?:30|5[2-57]|6[1-8]|7[2-8])|140)|8(?:052|87[1-3]))|5(?:2(?:4(?:3[2-79]|6\\d)|76\\d)|6(?:26[06-9]|686))|6(?:06(?:4\\d|7[4-79])|295[5-7]|35[34]\\d|47(?:24|61)|59(?:5[08]|6[67]|74)|9(?:55[0-4]|77[23]))|7(?:26(?:6[13-9]|7[0-7])|(?:442|688)\\d|50(?:2[0-3]|[3-68]2|76))|8(?:27[56]\\d|37(?:5[2-5]|8[239])|843[2-58])|9(?:0(?:0(?:6[1-8]|85)|52\\d)|3583|4(?:66[1-8]|9(?:2[01]|81))|63(?:23|3[1-4])|9561))\\d{3}',
        '7(?:457[0-57-9]|700[01]|911[028])\\d{5}|7(?:[1-3]\\d\\d|4(?:[0-46-9]\\d|5[0-689])|5(?:0[0-8]|[13-9]\\d|2[0-35-9])|7(?:0[1-9]|[1-7]\\d|8[02-9]|9[0-689])|8(?:[014-9]\\d|[23][0-8])|9(?:[024-9]\\d|1[02-9]|3[0-689]))\\d{6}',
        '80[08]\\d{7}|800\\d{6}|8001111',
        '(?:8(?:4[2-5]|7[0-3])|9(?:[01]\\d|8[2-49]))\\d{7}|845464\\d',
        '70\\d{8}',
        '(?:3[0347]|55)\\d{8}',
        '76(?:464|652)\\d{5}|76(?:0[0-28]|2[356]|34|4[01347]|5[49]|6[0-369]|77|8[14]|9[139])\\d{6}',
        '56\\d{8}',
      ],
    },
    {
      country: 'GG',
      general: '(?:1481|[357-9]\\d{3})\\d{6}|8\\d{6}(?:\\d{2})?',
      numbers: [
        '1481[25-9]\\d{5}',
        '7(?:(?:781|839)\\d|911[17])\\d{5}',
        '80[08]\\d{7}|800\\d{6}|8001111',
        '(?:8(?:4[2-5]|7[0-3])|9(?:[01]\\d|8[0-3]))\\d{7}|845464\\d',
        '70\\d{8}',
        '(?:3[0347]|55)\\d{8}',
        '76(?:464|652)\\d{5}|76(?:0[0-28]|2[356]|34|4[01347]|5[49]|6[0-369]|77|8[14]|9[139])\\d{6}',
        '56\\d{8}',
      ],
    },
    { country: 'IM', leading: '74576|(?:16|7[56])24' },
    {
      country: 'JE',
      general: '1534\\d{6}|(?:[3578]\\d|90)\\d{8}',
      numbers: [
        '1534[0-24-8]\\d{5}',
        '7(?:(?:(?:50|82)9|937)\\d|7(?:00[378]|97\\d))\\d{5}',
        '80(?:07(?:35|81)|8901)\\d{4}',
        '(?:8(?:4(?:4(?:4(?:05|42|69)|703)|5(?:041|800))|7(?:0002|1206))|90(?:066[59]|1810|71(?:07|55)))\\d{4}',
        '701511\\d{4}',
        '(?:3(?:0(?:07(?:35|81)|8901)|3\\d{4}|4(?:4(?:4(?:05|42|69)|703)|5(?:041|800))|7(?:0002|1206))|55\\d{4})\\d{4}',
        '76(?:464|652)\\d{5}|76(?:0[0-28]|2[356]|34|4[01347]|5[49]|6[0-369]|77|8[14]|9[139])\\d{6}',
        '56\\d{8}',
      ],
    },
  ],
  '47': [
    { country: 'NO', leading: '[02-689]|7[0-8]' },
    { country: 'SJ', leading: '79' },
  ],
  '61': [
    {
      country: 'AU',
      general: '1(?:[0-79]\\d{7}(?:\\d(?:\\d{2})?)?|8[0-24-9]\\d{7})|[2-478]\\d{8}|1\\d{4,7}',
      numbers: [
        '(?:(?:241|349)0\\d\\d|8(?:51(?:0(?:0[03-9]|[12479]\\d|3[2-9]|5[0-8]|6[1-9]|8[0-7])|1(?:[0235689]\\d|1[0-69]|4[0-589]|7[0-47-9])|2(?:0[0-79]|[18][13579]|2[14-9]|3[0-46-9]|[4-6]\\d|7[89]|9[0-4])|[34]\\d\\d)|91(?:(?:[0-58]\\d|6[0135-9])\\d|7(?:0[0-24-9]|[1-9]\\d)|9(?:[0-46-9]\\d|5[0-79]))))\\d{3}|(?:2(?:[0-26-9]\\d|3[0-8]|4[02-9]|5[0135-9])|3(?:[0-3589]\\d|4[0-578]|6[1-9]|7[0-35-9])|7(?:[013-57-9]\\d|2[0-8])|8(?:55|6[0-8]|[78]\\d|9[02-9]))\\d{6}',
        '4(?:79[01]|83[0-36-9]|95[0-3])\\d{5}|4(?:[0-36]\\d|4[047-9]|[58][0-24-9]|7[02-8]|9[0-47-9])\\d{6}',
        '180(?:0\\d{3}|2)\\d{3}',
        '190[0-26]\\d{6}',
        '163\\d{2,6}',
        '14(?:5(?:1[0458]|[23][458])|71\\d)\\d{4}',
        '13(?:00\\d{6}(?:\\d{2})?|45[0-4]\\d{3})|13\\d{4}',
      ],
    },
    {
      country: 'CC',
      general: '1(?:[0-79]\\d{8}(?:\\d{2})?|8[0-24-9]\\d{7})|[148]\\d{8}|1\\d{5,7}',
      numbers: [
        '8(?:51(?:0(?:02|31|60|89)|1(?:18|76)|223)|91(?:0(?:1[0-2]|29)|1(?:[28]2|50|79)|2(?:10|64)|3(?:[06]8|22)|4[29]8|62\\d|70[23]|959))\\d{3}',
        '4(?:79[01]|83[0-36-9]|95[0-3])\\d{5}|4(?:[0-36]\\d|4[047-9]|[58][0-24-9]|7[02-8]|9[0-47-9])\\d{6}',
        '180(?:0\\d{3}|2)\\d{3}',
        '190[0-26]\\d{6}',
        '14(?:5(?:1[0458]|[23][458])|71\\d)\\d{4}',
        '13(?:00\\d{6}(?:\\d{2})?|45[0-4]\\d{3})|13\\d{4}',
      ],
    },
    {
      country: 'CX',
      general: '1(?:[0-79]\\d{8}(?:\\d{2})?|8[0-24-9]\\d{7})|[148]\\d{8}|1\\d{5,7}',
      numbers: [
        '8(?:51(?:0(?:01|30|59|88)|1(?:17|46|75)|2(?:22|35))|91(?:00[6-9]|1(?:[28]1|49|78)|2(?:09|63)|3(?:12|26|75)|4(?:56|97)|64\\d|7(?:0[01]|1[0-2])|958))\\d{3}',
        '4(?:79[01]|83[0-36-9]|95[0-3])\\d{5}|4(?:[0-36]\\d|4[047-9]|[58][0-24-9]|7[02-8]|9[0-47-9])\\d{6}',
        '180(?:0\\d{3}|2)\\d{3}',
        '190[0-26]\\d{6}',
        '14(?:5(?:1[0458]|[23][458])|71\\d)\\d{4}',
        '13(?:00\\d{6}(?:\\d{2})?|45[0-4]\\d{3})|13\\d{4}',
      ],
    },
  ],
  '212': [
    { country: 'MA', leading: '[5-8]' },
    {
      country: 'EH',
      general: '[5-8]\\d{8}',
      numbers: [
        '528[89]\\d{5}',
        '(?:6(?:[0-79]\\d|8[0-247-9])|7(?:[016-8]\\d|2[0-8]|3[01]|5[0-5]))\\d{6}',
        '80[0-7]\\d{6}',
        '89\\d{7}',
        '(?:592(?:4[0-2]|93)|80[89]\\d\\d)\\d{4}',
      ],
    },
  ],
  '262': [
    {
      country: 'RE',
      general: '709\\d{6}|(?:26|[689]\\d)\\d{7}',
      numbers: [
        '2631[0-6]\\d{4}|26(?:2\\d|30|88)\\d{5}',
        '(?:69(?:2\\d\\d|3(?:[06][0-6]|1[0-3]|2[0-2]|3[0-39]|4\\d|5[0-5]|7[0-37]|8[0-8]|9[0-479]))|7092[0-3])\\d{4}',
        '80\\d{7}',
        '89[1-37-9]\\d{6}',
        '9(?:399[0-3]|479[0-6]|76(?:2[278]|3[0-37]))\\d{4}',
        '8(?:1[019]|2[0156]|84|90)\\d{6}',
      ],
    },
    {
      country: 'YT',
      general: '(?:639\\d|7093)\\d{5}|(?:26|80|9\\d)\\d{7}',
      numbers: [
        '26(?:89\\d|9(?:0[0-467]|15|5[0-4]|6\\d|[78]0))\\d{4}',
        '(?:639(?:0[0-79]|1[019]|[267]\\d|3[09]|40|5[05-9]|9[04-79])|7093[5-7])\\d{4}',
        '80\\d{7}',
        '9(?:(?:39|47)8[01]|769\\d)\\d{4}',
      ],
    },
  ],
  '290': [
    { country: 'SH', leading: '[256]' },
    { country: 'TA', leading: '8' },
  ],
  '358': [
    { country: 'FI', leading: '1[03-79]|[2-9]' },
    { country: 'AX', leading: '18' },
  ],
  '590': [
    {
      country: 'GP',
      general: '7090\\d{5}|(?:[56]9|[89]\\d)\\d{7}',
      numbers: [
        '(?:59(?:0(?:0[1-68]|[14][0-24-9]|2[0-68]|3[1-9]|5[3-579]|[68][0-689]|7[08]|9\\d)|87\\d)|80[6-9]\\d\\d)\\d{4}',
        '(?:69(?:0\\d\\d|1(?:2[2-9]|3[0-5]))|7090[0-4])\\d{4}',
        '80[0-5]\\d{6}',
        '8[129]\\d{7}',
        '9(?:(?:39[5-7]|76[018])\\d|475[0-6])\\d{4}',
      ],
    },
    {
      country: 'BL',
      general: '7090\\d{5}|(?:[56]9|[89]\\d)\\d{7}',
      numbers: [
        '(?:59(?:0(?:2[7-9]|3[3-7]|5[12]|87)|87\\d)|80[6-9]\\d\\d)\\d{4}',
        '(?:69(?:0\\d\\d|1(?:2[2-9]|3[0-5]))|7090[0-4])\\d{4}',
        '80[0-5]\\d{6}',
        '8[129]\\d{7}',
        '9(?:(?:39[5-7]|76[018])\\d|475[0-6])\\d{4}',
      ],
    },
    {
      country: 'MF',
      general: '7090\\d{5}|(?:[56]9|[89]\\d)\\d{7}',
      numbers: [
        '(?:59(?:0(?:0[079]|[14]3|[27][79]|3[03-7]|5[0-268]|87)|87\\d)|80[6-9]\\d\\d)\\d{4}',
        '(?:69(?:0\\d\\d|1(?:2[2-9]|3[0-5]))|7090[0-4])\\d{4}',
        '80[0-5]\\d{6}',
        '8[129]\\d{7}',
        '9(?:(?:39[5-7]|76[018])\\d|475[0-6])\\d{4}',
      ],
    },
  ],
  '599': [
    { country: 'CW', leading: '[69]' },
    { country: 'BQ', leading: '[347]' },
  ],
};

const COUNTRY_OF_CODE = new Map<string, PhoneCountry>();
for (const [country, callingCode] of Object.entries(CALLING_CODES)) {
  if (isPhoneCountry(country) && !COUNTRY_OF_CODE.has(callingCode)) {
    COUNTRY_OF_CODE.set(callingCode, SHARED_CODES[callingCode]?.[0]?.country ?? country);
  }
}

const fits = (pattern: string, digits: string) => new RegExp(`^(?:${pattern})$`).test(digits);

/** Whether a country's numbering plan places a number's national digits in it. */
const places = (plan: NumberingPlan, digits: string) =>
  'leading' in plan
    ? new RegExp(`^(?:${plan.leading})`).test(digits)
    : fits(plan.general, digits) && plan.numbers.some((pattern) => fits(pattern, digits));

/**
 * The country a number on `callingCode` is from, by what follows the code: the code's own country,
 * or for a code several countries share, the first of them its digits place it in, as
 * libphonenumber-js places it. Undefined while the digits don't say, such as part way through
 * typing. Digits after a national 0 are read without it too, as the site drops that 0.
 */
function countryOfDigits(callingCode: string, national: string): PhoneCountry | undefined {
  const plans = SHARED_CODES[callingCode];
  if (!plans) {
    return COUNTRY_OF_CODE.get(callingCode);
  }
  const digits = national.replace(/\D/g, '');
  for (const read of digits.startsWith('0') ? [digits, digits.slice(1)] : [digits]) {
    const plan = plans.find((candidate) => places(candidate, read));
    if (plan) {
      return plan.country;
    }
  }
  return undefined;
}

/**
 * A number written with its country code, after a + or the 00 most countries dial abroad with,
 * split into the country the code names and what follows the code as typed, or undefined for one
 * written without a code or with one no country has.
 */
export function readCallingCode(
  text: string,
): { country: PhoneCountry; callingCode: string; rest: string } | undefined {
  const match = /^\s*(?:\+|00)[\s().-]*(\d{1,3})/.exec(text);
  const digits = match?.[1];
  if (!match || !digits) {
    return undefined;
  }
  const codeStarts = match[0].length - digits.length;
  // The longest code that names a country: +1 is the US, and +12 no code at all.
  for (let length = digits.length; length > 0; length--) {
    const callingCode = digits.slice(0, length);
    const country = COUNTRY_OF_CODE.get(callingCode);
    if (country) {
      return { country, callingCode, rest: text.slice(codeStarts + length).trimStart() };
    }
  }
  return undefined;
}

/**
 * What was typed as a number with its code after a +, when it was written with one: after a +, a
 * 00, or the prefix `country` dials abroad with, such as 011 in the US. Undefined for a number
 * written as it is dialled at home.
 */
function international(text: string, country: PhoneCountry | undefined): string | undefined {
  const typed = text.trim();
  if (typed.startsWith('+')) {
    return typed;
  }
  // The country's own prefix first, as one such as Australia's 0011 begins with 00. Matched on the
  // digits alone, as a prefix can be written with spaces in it.
  const digits = typed.replace(/[^\d]/g, '');
  const prefix = country
    ? new RegExp(`^(?:${INTERNATIONAL_PREFIXES[country]})`).exec(digits)?.[0]
    : undefined;
  const length = prefix?.length ?? (digits.startsWith('00') ? 2 : 0);
  // Where the way of dialling abroad ends in what was typed. Only it, written with separators or
  // none, becomes the +, so text before it stays, and so does an extension after the number, for
  // the site to refuse rather than lose.
  const end = length ? [...typed.matchAll(/\d/g)][length - 1]?.index : undefined;
  if (end === undefined || !/^[\d\s().-]*$/.test(typed.slice(0, end + 1))) {
    return undefined;
  }
  return `+${typed.slice(end + 1).replace(/^[\s().-]+/, '')}`;
}

/**
 * The countries a phone number can be from, out of `countries` as an app names them, each named
 * with its code, such as `United Kingdom (+44)`, in the order given.
 */
export function phoneCountryOptions(
  countries: readonly { value: string; label: string }[],
): { value: PhoneCountry; label: string }[] {
  return countries.flatMap(({ value, label }) =>
    isPhoneCountry(value) ? [{ value, label: `${label} (+${CALLING_CODES[value]})` }] : [],
  );
}

/**
 * The country a phone input shows for what was typed, given the one picked. A number written as
 * it is dialled at home keeps the one picked, as Stripe Checkout keeps it. One written with its
 * code shows the country its digits are from once they say, so +1 416 shows Canada; until then,
 * the one picked while the code is that country's, so picking Canada keeps Canada while a +1
 * number is typed, and otherwise the country the code names.
 */
export function shownCountry(
  typed: string,
  picked: PhoneCountry | undefined,
): PhoneCountry | undefined {
  const written = international(typed, picked);
  if (!written) {
    return picked;
  }
  // A code no country has names no country, rather than the one picked.
  const read = readCallingCode(written);
  if (!read) {
    return undefined;
  }
  return (
    countryOfDigits(read.callingCode, read.rest) ??
    (picked && CALLING_CODES[picked] === read.callingCode ? picked : read.country)
  );
}

/**
 * A number as a phone field is sent it, from what was typed beside `country`: a number written as
 * it is dialled at home gets the country's code in front, and one written with its own code keeps
 * it, read as after a + whether it was written after a +, a 00, or the prefix the country dials
 * abroad with. Nothing typed stays nothing, so an emptied field is cleared, and a number written
 * without a code when no country is shown goes as it was written, for the site to say what it
 * needs. The site drops a national 0 after the code.
 */
export function withCallingCode(text: string, country: PhoneCountry | undefined): string {
  const typed = text.trim();
  const written = international(typed, country);
  if (written) {
    return written;
  }
  // Only a number gets a code: text with no digits in it goes as written, for the site to refuse.
  if (!country || !/\d/.test(typed)) {
    return typed;
  }
  return `+${CALLING_CODES[country]} ${typed}`;
}

/** What a phone input holds while someone edits it: what they typed, and the country picked. */
export interface PhoneEntry {
  readonly typed: string;
  readonly picked: PhoneCountry | undefined;
}

/**
 * The country a held number is from: `otherwise` when it holds none, and the country its digits
 * place it in, so a Toronto number is Canadian whoever reads it. Where the digits of a code several
 * countries share don't say, `otherwise` when it shares the code, and the code's main country when
 * not.
 */
function countryOfHeld(
  held: string,
  otherwise: PhoneCountry | undefined,
): PhoneCountry | undefined {
  const read = readCallingCode(held);
  if (!read) {
    return otherwise;
  }
  return (
    countryOfDigits(read.callingCode, read.rest) ??
    (otherwise && CALLING_CODES[otherwise] === read.callingCode ? otherwise : read.country)
  );
}

/**
 * A phone input showing a held number: the country it is from, and the number after the code that
 * country's picker already shows, so it reads the same as one typed beside it. A number with no
 * code this can read is shown as held.
 */
function showHeld(held: string, otherwise: PhoneCountry | undefined): PhoneEntry {
  const picked = countryOfHeld(held, otherwise);
  const read = readCallingCode(held);
  const shown = read && picked && CALLING_CODES[picked] === read.callingCode;
  return { typed: shown ? read.rest : held, picked };
}

/**
 * A phone input as it opens on the number a field holds: the country that number is from, so
 * rewriting it as it is dialled at home keeps its country, and for a field holding none, the
 * country of the reader's `timeZone` where it names one, as it says where they are, else of their
 * language.
 */
export function startPhoneEntry(
  held: string,
  locales: readonly string[],
  timeZone?: string,
): PhoneEntry {
  const ofLocales = phoneCountryOfLocales(locales);
  return showHeld(held, (!held && phoneCountryOfTimeZone(timeZone, ofLocales)) || ofLocales);
}

/**
 * A phone input once the number it holds is replaced from outside, such as by the number the site
 * kept: the country that number is from, and the number after its code.
 */
export function holdNumber(entry: PhoneEntry, held: string): PhoneEntry {
  return showHeld(held, entry.picked);
}

/** A phone input once `text` is typed into it, and the number it sends. */
export function typeNumber(entry: PhoneEntry, text: string): { entry: PhoneEntry; number: string } {
  // Through the country picked, whose own way of dialling abroad the number may be written with.
  return { entry: { ...entry, typed: text }, number: withCallingCode(text, entry.picked) };
}

/**
 * A phone input once `country` is picked, and the number it sends: a number written with its
 * code takes the country's code in its place.
 */
export function pickCountry(
  entry: PhoneEntry,
  country: PhoneCountry,
): { entry: PhoneEntry; number: string } {
  const written = international(entry.typed, entry.picked);
  const read = written === undefined ? undefined : readCallingCode(written);
  const typed = read ? `+${CALLING_CODES[country]} ${read.rest}` : entry.typed;
  return { entry: { typed, picked: country }, number: withCallingCode(typed, country) };
}

/** The time zones of a country, from the browser's own data: none where it has no such data. */
function timeZonesOf(country: PhoneCountry): string[] {
  try {
    // `getTimeZones()`, or a `timeZones` getter in browsers that shipped it as one.
    const locale = new Intl.Locale(`und-${country}`) as Intl.Locale & {
      getTimeZones?: () => string[];
      timeZones?: string[];
    };
    return locale.getTimeZones?.() ?? locale.timeZones ?? [];
  } catch {
    return [];
  }
}

/**
 * The country a time zone is in, such as Portugal for `Europe/Lisbon`, from the browser's own time
 * zone data: none for a zone no country has, such as `Etc/UTC`, or where the browser has no such
 * data. The `likely` country is tried first, as reading every country's zones takes a moment.
 * Safari names some zones newer than its own data does, such as `Asia/Kolkata`, and finds none.
 */
export function phoneCountryOfTimeZone(
  timeZone: string | undefined,
  likely?: PhoneCountry,
): PhoneCountry | undefined {
  // No country has UTC or an `Etc/` zone, so there's no need to read any country's zones.
  if (!timeZone || timeZone === 'UTC' || timeZone.startsWith('Etc/')) {
    return undefined;
  }
  if (likely && timeZonesOf(likely).includes(timeZone)) {
    return likely;
  }
  return (Object.keys(CALLING_CODES) as PhoneCountry[]).find((country) =>
    timeZonesOf(country).includes(timeZone),
  );
}

/**
 * The country someone most likely has a number from, by the region of the first of their
 * `locales` that names one a phone can belong to: `en-GB` is the United Kingdom, and `fr` France.
 */
export function phoneCountryOfLocales(locales: readonly string[]): PhoneCountry | undefined {
  for (const locale of locales) {
    try {
      const region = new Intl.Locale(locale).maximize().region;
      if (region && isPhoneCountry(region)) {
        return region;
      }
    } catch {
      // A locale Intl doesn't accept names no region, so the next is tried.
    }
  }
  return undefined;
}
