/**
 * Location configurations for website speed audits
 */

export interface LocationStat {
  value: string;
  label: string;
}

export interface LocationConfig {
  location: string;
  keyword: string;
  serviceAreaNote: string;
  localStats: LocationStat[];
}

export const LOCATIONS: LocationConfig[] = [
  {
    "location": "north-carolina",
    "keyword": "website speed audit north carolina",
    "serviceAreaNote": "Remote audits available statewide.",
    "localStats": [
      {
        "value": "67%",
        "label": "of NC businesses have slow websites"
      },
      {
        "value": "$2.3M",
        "label": "potential annual revenue lost to slow sites"
      }
    ]
  },
  {
    "location": "california",
    "keyword": "website speed audit california",
    "serviceAreaNote": "Remote audits available statewide.",
    "localStats": [
      {
        "value": "72%",
        "label": "of CA businesses have slow websites"
      },
      {
        "value": "$8.1M",
        "label": "potential annual revenue lost to slow sites"
      }
    ]
  },
  {
    "location": "texas",
    "keyword": "website speed audit texas",
    "serviceAreaNote": "Remote audits available statewide.",
    "localStats": [
      {
        "value": "62%",
        "label": "of TX businesses have slow websites"
      },
      {
        "value": "$5.7M",
        "label": "potential annual revenue lost to slow sites"
      }
    ]
  },
  {
    "location": "florida",
    "keyword": "website speed audit florida",
    "serviceAreaNote": "Remote audits available statewide.",
    "localStats": [
      {
        "value": "69%",
        "label": "of FL businesses have slow websites"
      },
      {
        "value": "$6.2M",
        "label": "potential annual revenue lost to slow sites"
      }
    ]
  },
  {
    "location": "illinois",
    "keyword": "website speed audit illinois",
    "serviceAreaNote": "Remote audits available statewide.",
    "localStats": [
      {
        "value": "65%",
        "label": "of IL businesses have slow websites"
      },
      {
        "value": "$4.8M",
        "label": "potential annual revenue lost to slow sites"
      }
    ]
  },
  {
    "location": "washington",
    "keyword": "website speed audit washington",
    "serviceAreaNote": "Remote audits available statewide.",
    "localStats": [
      {
        "value": "61%",
        "label": "of WA businesses have slow websites"
      },
      {
        "value": "$3.9M",
        "label": "potential annual revenue lost to slow sites"
      }
    ]
  },
  {
    "location": "georgia",
    "keyword": "website speed audit georgia",
    "serviceAreaNote": "Remote audits available statewide.",
    "localStats": [
      {
        "value": "71%",
        "label": "of GA businesses have slow websites"
      },
      {
        "value": "$5.1M",
        "label": "potential annual revenue lost to slow sites"
      }
    ]
  },
  {
    "location": "arizona",
    "keyword": "website speed audit arizona",
    "serviceAreaNote": "Remote audits available statewide.",
    "localStats": [
      {
        "value": "68%",
        "label": "of AZ businesses have slow websites"
      },
      {
        "value": "$4.5M",
        "label": "potential annual revenue lost to slow sites"
      }
    ]
  },
  {
    "location": "new-york",
    "keyword": "website speed audit new york",
    "serviceAreaNote": "Remote audits available statewide.",
    "localStats": [
      {
        "value": "70%",
        "label": "of NY businesses have slow websites"
      },
      {
        "value": "$7.8M",
        "label": "potential annual revenue lost to slow sites"
      }
    ]
  },
  {
    "location": "pennsylvania",
    "keyword": "website speed audit pennsylvania",
    "serviceAreaNote": "Remote audits available statewide.",
    "localStats": [
      {
        "value": "64%",
        "label": "of PA businesses have slow websites"
      },
      {
        "value": "$4.2M",
        "label": "potential annual revenue lost to slow sites"
      }
    ]
  },
  {
    "location": "ohio",
    "keyword": "website speed audit ohio",
    "serviceAreaNote": "Remote audits available statewide.",
    "localStats": [
      {
        "value": "61%",
        "label": "of ohio businesses have slow websites"
      },
      {
        "value": "$5.0M",
        "label": "potential annual revenue lost to slow sites"
      }
    ]
  },
  {
    "location": "colorado",
    "keyword": "website speed audit colorado",
    "serviceAreaNote": "Remote audits available statewide.",
    "localStats": [
      {
        "value": "68%",
        "label": "of colorado businesses have slow websites"
      },
      {
        "value": "$5.0M",
        "label": "potential annual revenue lost to slow sites"
      }
    ]
  },
  {
    "location": "michigan",
    "keyword": "website speed audit michigan",
    "serviceAreaNote": "Remote audits available statewide.",
    "localStats": [
      {
        "value": "61%",
        "label": "of michigan businesses have slow websites"
      },
      {
        "value": "$5.4M",
        "label": "potential annual revenue lost to slow sites"
      }
    ]
  }
];

export function getLocationBySlug(slug: string): LocationConfig | undefined {
  return LOCATIONS.find(loc => loc.location === slug);
}

export function getStateAbbreviation(location: string): string {
  const abbreviations: Record<string, string> = {
    'north-carolina': 'NC',
    'california': 'CA',
    'texas': 'TX',
    'florida': 'FL',
    'illinois': 'IL',
    'washington': 'WA',
    'georgia': 'GA',
    'arizona': 'AZ',
    'new-york': 'NY',
    'pennsylvania': 'PA',
    'ohio': 'OH',
    'colorado': 'CO',
    'michigan': 'MI'
  };
  return abbreviations[location] ?? location;
}
