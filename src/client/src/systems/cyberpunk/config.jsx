// src/client/src/systems/cyberpunk/config.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Configuration frontend du slug Cyberpunk (The Sprawl — adaptation 2d10).
//
// Contrat diceEngine v2 :
//   - buildNotation(ctx) → string   (appelé par le composant, pas le moteur)
//   - beforeRoll(ctx)    → ctx enrichi
//   - afterRoll(raw, ctx)→ result
//   - buildAnimationSequence(raw, ctx, result) → AnimationSequence
//   - renderHistoryEntry(entry) → JSX | null
//
// Système de résolution 2d10 + modificateur :
//   15+    → succès plein
//   10-14  → succès partiel
//   9-     → échec
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import DiceEntryHistory from "./components/layout/DiceEntryHistory.jsx";

// ── Constantes ────────────────────────────────────────────────────────────────

const SEUIL_SUCCES  = 15;
const SEUIL_PARTIEL = 10;

// Couleur par stat pour l'animation
const STAT_COLOR = {
    cran:   'magenta',
    pro:    'cyan',
    chair:  'orange',
    esprit: 'purple',
    style:  'amber',
    synth:  'green',
    cred:   'gold',
    null:   'default',
};

// Label court des stats pour l'affichage
const STAT_LABEL = {
    cran:   'Cran',
    pro:    'Pro',
    chair:  'Chair',
    esprit: 'Esprit',
    style:  'Style',
    synth:  'Synth',
    cred:   'Cred',
};

export const OUTCOME_LABEL = {
    success: 'Succès plein',
    partial: 'Succès partiel',
    failure: 'Échec',
};

export const OUTCOME_CLASS = {
    success: 'cp-outcome-success',
    partial: 'cp-outcome-partial',
    failure: 'cp-outcome-failure',
};

export const ITEM_AND_CYBERWARE_CATEGORY_LABEL = {
    arme_feu:     'Armes à feu',
    grenade:      'Grenades',
    arme_blanche: 'Armes blanches',
    protection:   'Protection',
    equipement:   'Équipement',
    vehicule:     'Véhicules',
    drone:        'Drones',
    // Catégories Cyberware
    neural:       'Système Neural',
    armement:     'Cyber-armement',
    survie:       'Survie & Bioware',
    infiltration: 'Infiltration',
    membres:      'Membres Cyber',
    physique:     'Physique & Greffes',
    sensoriel:    'Capteurs & Optiques',
    social:       'Social & Cosmétique',
    netrunning:   'Netrunning',
    technique:    'Interface Technique',
};

export const TAG_VARIANT_CLASS = {
    positive: 'cp-tag-positive',
    negative: 'cp-tag-negative',
    neutral:  'cp-tag-neutral',
};

export const CYBERWARE_ALL = [
    // --- BORGWARE (TRANSFORMATION LOURDE) ---
    {
        name:        'Châssis Linéaire (Sigma/Bêta)',
        category:    'physique',
        description: 'Exosquelette greffé directement sur l\'ossature. Augmente la puissance brute de manière colossale.',
        optionHint:  'Sigma (Force +1) · Bêta (Force +2)',
        tags: [
            { text: '+surhumain', variant: 'positive' },
            { text: '+encombrant', variant: 'negative' },
            { text: '+puissant', variant: 'positive' },
        ],
    },
    {
        name:        'Monture Multi-Optique',
        category:    'sensoriel',
        description: 'Grappe de capteurs faciaux permettant d\'accueillir jusqu\'à 5 yeux cybernétiques supplémentaires.',
        optionHint:  'Vision 360° · Analyseur de micro-expressions · Spectromètre',
        tags: [
            { text: '+360° vision', variant: 'positive' },
            { text: '+horrifique', variant: 'negative' },
        ],
    },

    // --- FASHIONWARE (STYLE & COSMÉTIQUE) ---
    {
        name:        'Techhair (Fibre optique)',
        category:    'social',
        description: 'Cheveux en fibres synthétiques capables de changer de couleur ou de s\'éclairer selon l\'humeur.',
        optionHint:  null,
        tags: [
            { text: '+style', variant: 'positive' },
            { text: '+lumineux', variant: 'neutral' },
        ],
    },
    {
        name:        'Shift Tacts (Lentilles colorées)',
        category:    'social',
        description: 'Implants oculaires cosmétiques changeant la couleur et le motif de l\'iris à volonté.',
        optionHint:  null,
        tags: [
            { text: '+camouflage iris', variant: 'positive' },
        ],
    },
    {
        name:        'Skinwatch (Montre dermique)',
        category:    'social',
        description: 'Affichage LED sous-cutané sur le poignet indiquant l\'heure et les constantes vitales.',
        optionHint:  null,
        tags: [
            { text: '+pratique', variant: 'neutral' },
        ],
    },
    {
        name:        'Câblage EMP (Threading)',
        category:    'social',
        description: 'Circuits dorés ou argentés gravés sur la peau. Ne sert à rien, sauf à montrer qu\'on a les moyens.',
        optionHint:  null,
        tags: [
            { text: '+style', variant: 'positive' },
            { text: '+brillant', variant: 'neutral' },
        ],
    },
    {
        name:        'Mr. Studd / Midnight Lady',
        category:    'social',
        description: 'Implants génitaux de performance pour "toute la nuit, toutes les nuits". Augmente le style en situation intime.',
        optionHint:  null,
        tags: [
            { text: '+endurance sexuelle', variant: 'neutral' },
            { text: '+risqué (contrefaçon)', variant: 'negative' },
        ],
    },

    // --- SURVIE & SPÉCIALISÉ ---
    {
        name:        'Branchies (Gills)',
        category:    'survie',
        description: 'Filtres osmotiques implantés dans le cou. Permet de respirer sous l\'eau indéfiniment.',
        optionHint:  null,
        tags: [
            { text: '+aquatique', variant: 'positive' },
        ],
    },
    {
        name:        'Radar / Sonar Interne',
        category:    'sensoriel',
        description: 'Émetteur d\'ondes ultrasoniques. Permet de détecter les formes à travers les murs ou dans le noir total.',
        optionHint:  null,
        tags: [
            { text: '+écholocalisation', variant: 'positive' },
            { text: '+portée 20m', variant: 'neutral' },
        ],
    },
    {
        name:        'Holster Dissimulé',
        category:    'armement',
        description: 'Compartiment escamotable dans la cuisse ou le torse pour cacher une arme de poing légère.',
        optionHint:  null,
        tags: [
            { text: '+discret', variant: 'positive' },
        ],
    },

    // --- NEURAL ---
    {
        name:        'Puce de Mémoire (Backup)',
        category:    'neural',
        description: 'Stockage externe pour souvenirs ou données cryptées. Protège contre les amnésies traumatiques.',
        optionHint:  null,
        tags: [
            { text: '+stockage data', variant: 'positive' },
            { text: '+inaltérable', variant: 'positive' },
        ],
    },
    // --- SYSTÈMES DE RÉFLEXES & COMBAT (NEURAL) ---
    {
        name:        'Sandevistan (Accélérateur neural)',
        category:    'Neural',
        description: 'Dilate la perception du temps. Une fois par scène : esquive auto ou action supplémentaire simple.',
        optionHint:  'Dynalar · Militech Falcon · Apogee',
        tags: [
            { text: '+vitesse extrême', variant: 'positive' },
            { text: '+aliénant',   variant: 'negative' },
            { text: '+douloureux', variant: 'negative' },
        ],
    },
    {
        name:        'Module Berserk (Injecteur d\'adrénaline)',
        category:    'Neural',
        description: 'Une fois par scène : ignore la douleur et gagne +1 dégât au contact. Impossible de battre en retraite tant qu\'actif.',
        optionHint:  'Biodyne · Moore Tech · Zetatech',
        tags: [
            { text: '+bestial',  variant: 'neutral' },
            { text: '+1 dégât mêlée', variant: 'positive' },
            { text: '+résilience', variant: 'positive' },
        ],
    },
    {
        name:        'Kerenzikov (Réflexes passifs)',
        category:    'Neural',
        description: 'Boost de réactivité constante. Une fois par scène : déclenche un move simple en même temps qu\'un autre move de combat.',
        optionHint:  null,
        tags: [
            { text: '+précision',  variant: 'positive'  },
            { text: '+réactif', variant: 'positive' },
        ],
    },
    {
        name:        'Câblage Nerveux (Boost)',
        category:    'Neural',
        description: 'Amélioration des influx synaptiques. +1 sur le prochain jet si aucun adversaire n\'est "câblé".',
        optionHint:  null,
        tags: [
            { text: '+réactif', variant: 'positive' },
            { text: '+1 Agir sous pression', variant: 'positive' },
        ],
    },

    // --- CYBER-ARMEMENT ---
    {
        name:        'Cyberarmement de corps',
        category:    'Armement',
        description: 'Armes dissimulées sous la peau : Lames Mantis, Monocâble, Bras de Gorille ou Lance-projectile.',
        optionHint:  'Lames Mantis · Monocâble · Bras de Gorille · Lance-projectile',
        tags: [
            { text: '+discret',  variant: 'positive' },
            { text: '+Lames Mantis',  variant: 'neutral' },
            { text: '+Monocâble',  variant: 'neutral' },
            { text: '+Bras de Gorille',  variant: 'neutral' },
        ],
    },
    {
        name:        'Slice \'N Dice (Fil monofilament)',
        category:    'Armement',
        description: 'Fil de monofilament logé dans le poignet, capable de trancher l\'acier. (3-dégâts +contact +carnage +discret)',
        optionHint:  null,
        tags: [
            { text: '3-dégâts',  variant: 'neutral'  },
            { text: '+contact',  variant: 'neutral'  },
            { text: '+carnage',  variant: 'neutral'  },
            { text: '+discret',  variant: 'positive' },
        ],
    },
    {
        name:        'Projecteur de Micro-vibrations',
        category:    'Armement',
        description: 'Émetteur ultrasonique intégré. Augmente la perforation des lames ou des poings. Ignore 1-Armure.',
        optionHint:  null,
        tags: [
            { text: 'perce-armure', variant: 'positive' },
            { text: '+vibration', variant: 'neutral' },
        ],
    },

    // --- PROTECTION & SYSTÈME IMMUNITAIRE ---
    {
        name:        'Blindage Sous-cutané',
        category:    'Protection',
        description: 'Plaques de céramique/kevlar. Réduit les conséquences graves — soustrait 2 aux jets de blessure mortelle.',
        optionHint:  null,
        tags: [
            { text: '-2 blessure mortelle', variant: 'positive' },
            { text: '-3 vs +fléchettes',    variant: 'positive' },
        ],
    },
    {
        name:        'Revêtement de Chaleur / Anti-EMP',
        category:    'Protection',
        description: 'Protection contre les températures extrêmes et les décharges électriques. Immunise contre les tags +feu et +électrique.',
        optionHint:  null,
        tags: [
            { text: '+isolé', variant: 'positive' },
            { text: '+blindé', variant: 'positive' },
        ],
    },
    {
        name:        'Optique de Camouflage',
        category:    'Infiltration',
        description: 'Nano-pigments de réfraction. Une fois par scène : deviens invisible pendant quelques instants (bonus de +2 en discrétion).',
        optionHint:  null,
        tags: [
            { text: '+invisible', variant: 'positive' },
            { text: '+consomme énergie', variant: 'negative' },
        ],
    },
    {
        name:        'Éditeur de douleur',
        category:    'Protection',
        description: 'Supprime les signaux sensoriels de douleur. Ignore les malus de blessure tant que vous n\'êtes pas HS.',
        optionHint:  null,
        tags: [
            { text: '+insensible', variant: 'positive' },
            { text: '+aliénant', variant: 'negative' },
        ],
    },

    // --- SYSTÈMES VITAUX & BIOWARE ---
    {
        name:        'Second Cœur',
        category:    'Survie',
        description: 'Organe de secours automatique. Une fois par mission : ignore une blessure qui devrait être fatale.',
        optionHint:  null,
        tags: [
            { text: '+survie', variant: 'positive' },
            { text: '+automatique', variant: 'neutral' },
        ],
    },
    {
        name:        'Pompe Sanguine / Bio-moniteur',
        category:    'Survie',
        description: 'Injecte des coagulants en cas de choc. Une fois par mission : soigne automatiquement 1-segment de dégâts.',
        optionHint:  null,
        tags: [
            { text: '+soins auto', variant: 'positive' },
            { text: '+adrénaline', variant: 'neutral' },
        ],
    },
    {
        name:        'Cœur Synthétique (Adrénaline)',
        category:    'Survie',
        description: 'Remplacement cardiaque haute performance. +1 sur les jets d\'endurance ou d\'effort physique intense.',
        optionHint:  null,
        tags: [
            { text: '+endurant', variant: 'positive' },
            { text: '+récupération', variant: 'positive' },
        ],
    },
    {
        name:        'Poumons Synthétiques (O2 Boost)',
        category:    'Survie',
        description: 'Traitement de l\'oxygène optimisé. Permet de retenir sa respiration 10min et donne +1 sur les jets de sprint.',
        optionHint:  null,
        tags: [
            { text: '+endurant', variant: 'positive' },
            { text: '+athlétique', variant: 'positive' },
        ],
    },
    {
        name:        'Détoxificateur Métabolique',
        category:    'Survie',
        description: 'Immunise contre les gaz toxiques et les drogues de rue. Purge le foie instantanément.',
        optionHint:  null,
        tags: [
            { text: '+immunité toxines', variant: 'positive' },
            { text: '+résistance gaz', variant: 'positive' },
        ],
    },

    // --- MEMBRES & PHYSIQUE ---
    {
        name:        'Cyberbras (Cyberarm)',
        category:    'Membres',
        description: 'Membre de remplacement allant de la prothèse industrielle à l\'outil de précision.',
        optionHint:  'Actionneur hydraulique · Main-outil · Boîtier de rangement',
        tags: [
            { text: '+force augmentée',  variant: 'neutral' },
            { text: '+robuste',  variant: 'positive' },
            { text: '+outils intégrés',  variant: 'neutral' },
        ],
    },
    {
        name:        'Cyberjambes (Cyberlegs)',
        category:    'Membres',
        description: 'Membres inférieurs optimisés. +1 sur Agir sous pression si les jambes peuvent aider.',
        optionHint:  'Saut assisté · Pieds magnétiques · Propulseurs de cheville',
        tags: [
            { text: '+agile',   variant: 'positive' },
            { text: '+double saut',   variant: 'positive' },
            { text: '+vitesse sprint',   variant: 'positive' },
        ],
    },
    {
        name:        'Greffe Musculaire (Internal)',
        category:    'Physique',
        description: 'Renforcement des tissus par biopolymères. Permet de lancer 2d10+Synth au lieu de Chair pour Employer la manière forte.',
        optionHint:  null,
        tags: [
            { text: '+puissant',          variant: 'positive' },
            { text: '+1 dégât mêlée',     variant: 'positive' },
        ],
    },
    {
        name:        'Articulations Silencieuses',
        category:    'Infiltration',
        description: 'Revêtement en polymère souple sur les pivots mécaniques. +1 sur les jets de discrétion par mouvement.',
        optionHint:  null,
        tags: [
            { text: '+silencieux', variant: 'positive' },
        ],
    },

    // --- SENSORIEL & SOCIAL ---
    {
        name:        'Cyberoptiques (Kiroshi)',
        category:    'Sensoriel',
        description: 'Yeux de remplacement avec capteurs multispectraux. Permet de lancer 2d10+Synth pour Évaluer.',
        optionHint:  '+thermique · +vision nocturne · +zoom · +anti-flash · +analyseur de trajectoire',
        tags: [
            { text: '+zoom',  variant: 'positive' },
            { text: '+anti-flash',  variant: 'positive' },
            { text: '+enregistrement',  variant: 'positive' },
        ],
    },
    {
        name:        'Cyberaudition',
        category:    'Sensoriel',
        description: 'Système auditif filtrant les fréquences. Permet de lancer 2d10+Synth pour Évaluer.',
        optionHint:  '+atténuateur · +sonar · +enregistrement · +cryptage',
        tags: [
            { text: '+atténuation',  variant: 'positive' },
            { text: '+sonar',  variant: 'positive' },
            { text: '+enregistrement',  variant: 'positive' },
        ],
    },
    {
        name:        'Face-plate (Cale de visage)',
        category:    'Infiltration',
        description: 'Plaques faciales mobiles permettant de changer de traits. +1 pour Usurper une identité ou passer Incognito.',
        optionHint:  null,
        tags: [
            { text: '+incognito', variant: 'positive' },
            { text: '+transformation', variant: 'neutral' },
        ],
    },
    {
        name:        'Synthétiseur Vocal (Audio-masque)',
        category:    'Social',
        description: 'Modulateur de cordes vocales. Peut imiter n\'importe quelle voix enregistrée.',
        optionHint:  null,
        tags: [
            { text: '+imitation', variant: 'positive' },
        ],
    },
    {
        name:        'Peau Synthétique (Chemskin)',
        category:    'Social',
        description: 'Peau capable de changer de couleur ou de texture. +1 sur les jets de Style ou de Séduction.',
        optionHint:  '+camouflage · +motifs lumineux · +chrome',
        tags: [
            { text: '+style', variant: 'positive' },
            { text: '+charisme', variant: 'positive' },
        ],
    },

    // --- UTILITAIRE & TECH ---
    {
        name:        'Neuralink & Comms',
        category:    'Neural',
        description: 'Lien neuronal direct avec les réseaux. Permet de lancer 2d10+Synth pour Évaluer en situation tactique.',
        optionHint:  '+brouillage · +relais satellite · +cryptage · +partition cachée',
        tags: [
            { text: '+brouillage',  variant: 'positive' },
            { text: '+crypté',  variant: 'positive' },
            { text: '+enregistrement',  variant: 'positive' },
        ],
    },
    {
        name:        'Cyberconsole intégrée (Deck)',
        category:    'Netrunning',
        description: 'Console de piratage greffée dans le crâne. +Furtivité, impossible à confisquer.',
        optionHint:  '+vitesse RAM · +crypté · +slots mémoire · +furtif',
        tags: [
            { text: '+furtif',   variant: 'positive' },
            { text: '+vitesse RAM',   variant: 'positive' },
        ],
    },
    {
        name:        'Prise de Chipware (Socket)',
        category:    'Neural',
        description: 'Processeur cérébral pour puces Mnemonic. Démarre avec 2 puces, 2 ports disponibles.',
        optionHint:  'Ex : Karaté · Piratage · Pilotage · Armes de poing',
        tags: [
            { text: '+polyvalent',  variant: 'positive'  },
            { text: '+1 continu puce active', variant: 'positive' },
        ],
    },
    {
        name:        'Lien de Pilotage (Interface)',
        category:    'Technique',
        description: 'Prises neurales pour véhicules et drones. Permet de "devenir" la machine (Seconde Peau).',
        optionHint:  null,
        tags: [
            { text: '+connecté', variant: 'positive' },
            { text: '+1 Pilotage', variant: 'positive' },
        ],
    },
    {
        name:        'Poche de Rangement (Cargo)',
        category:    'Infiltration',
        description: 'Espace de stockage dissimulé dans un membre. Indétectable aux scanners corporels.',
        optionHint:  null,
        tags: [
            { text: '+indétectable', variant: 'positive' },
            { text: '+inventaire', variant: 'neutral' },
        ],
    },
    {
        name:        'Enregistreur de Braindance',
        category:    'Sensoriel',
        description: 'Capteur sensoriel total. Déclare que tu enregistres → gagne automatiquement [info] exploitable.',
        optionHint:  null,
        tags: [
            { text: '+enregistrement BD', variant: 'neutral' },
        ],
    },
];

export const ITEMS_ALL = [
    // ── Armes à feu ──────────────────────────────────────────────────────────
    {
        name:     'Pistolet de poche',
        category: 'arme_feu',
        tags: [
            { text: '2-dégâts',        variant: 'neutral'  },
            { text: '+contact/courte', variant: 'neutral'  },
            { text: '+discret',        variant: 'positive' },
            { text: '+rapide',         variant: 'positive' },
            { text: '+recharge',       variant: 'negative' },
            { text: '+bruyant',        variant: 'negative' },
        ],
    },
    {
        name:     'Pistolet à fléchettes',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',        variant: 'neutral'  },
            { text: '+courte/proche',  variant: 'neutral'  },
            { text: '+rapide',         variant: 'positive' },
            { text: '+fléchettes',     variant: 'neutral'  },
        ],
    },
    {
        name:     'Revolver léger',
        category: 'arme_feu',
        tags: [
            { text: '2-dégâts',       variant: 'neutral'  },
            { text: '+courte/proche', variant: 'neutral'  },
            { text: '+rapide',        variant: 'positive' },
            { text: '+recharge',      variant: 'negative' },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Pistolet semi-automatique',
        category: 'arme_feu',
        tags: [
            { text: '2-dégâts',       variant: 'neutral'  },
            { text: '+courte/proche', variant: 'neutral'  },
            { text: '+rapide',        variant: 'positive' },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Revolver lourd',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',       variant: 'neutral'  },
            { text: '+courte/proche', variant: 'neutral'  },
            { text: '+recharge',      variant: 'negative' },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Pistolet lourd',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',       variant: 'neutral'  },
            { text: '+courte/proche', variant: 'neutral'  },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Fusil à pompe',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',       variant: 'neutral'  },
            { text: '+courte/proche', variant: 'neutral'  },
            { text: '+carnage',       variant: 'neutral'  },
            { text: '+recharge',      variant: 'negative' },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Fusil de combat',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',       variant: 'neutral'  },
            { text: '+courte/proche', variant: 'neutral'  },
            { text: '+carnage',       variant: 'neutral'  },
            { text: '+automatique',   variant: 'neutral'  },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Fusil d\'assaut',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',        variant: 'neutral'  },
            { text: '+proche/longue',  variant: 'neutral'  },
            { text: '+automatique',    variant: 'neutral'  },
            { text: '+bruyant',        variant: 'negative' },
        ],
    },
    {
        name:     'Pistolet-mitrailleur',
        category: 'arme_feu',
        tags: [
            { text: '2-dégâts',       variant: 'neutral'  },
            { text: '+courte/proche', variant: 'neutral'  },
            { text: '+automatique',   variant: 'neutral'  },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Mitrailleuse légère',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',        variant: 'neutral'  },
            { text: '+proche/longue',  variant: 'neutral'  },
            { text: '+carnage',        variant: 'neutral'  },
            { text: '+automatique',    variant: 'neutral'  },
            { text: '+encombrant',     variant: 'negative' },
            { text: '+bruyant',        variant: 'negative' },
        ],
    },
    {
        name:     'Fusil de précision',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',        variant: 'neutral'  },
            { text: '+longue/extrême', variant: 'neutral'  },
            { text: '+encombrant',     variant: 'negative' },
            { text: '+bruyant',        variant: 'negative' },
        ],
    },
    {
        name:     'Fusil antichar',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',        variant: 'neutral'  },
            { text: '+longue/extrême', variant: 'neutral'  },
            { text: '+carnage',        variant: 'neutral'  },
            { text: '+antiblindage',   variant: 'neutral'  },
            { text: '+encombrant',     variant: 'negative' },
            { text: '+bruyant',        variant: 'negative' },
        ],
    },
    {
        name:     'Lance-roquette',
        category: 'arme_feu',
        tags: [
            { text: '4-dégâts',       variant: 'neutral'  },
            { text: '+proche/longue', variant: 'neutral'  },
            { text: '+zone',          variant: 'neutral'  },
            { text: '+carnage',       variant: 'neutral'  },
            { text: '+encombrant',    variant: 'negative' },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Lance-roquette usage unique',
        category: 'arme_feu',
        tags: [
            { text: '4-dégâts',    variant: 'neutral'  },
            { text: '+proche',     variant: 'neutral'  },
            { text: '+zone',       variant: 'neutral'  },
            { text: '+carnage',    variant: 'neutral'  },
            { text: '+recharge',   variant: 'negative' },
            { text: '+bruyant',    variant: 'negative' },
        ],
    },

    // ── Grenades ─────────────────────────────────────────────────────────────
    {
        name:     'Grenades à fragmentation',
        category: 'grenade',
        tags: [
            { text: '4-dégâts',  variant: 'neutral'  },
            { text: '+proche',   variant: 'neutral'  },
            { text: '+zone',     variant: 'neutral'  },
            { text: '+carnage',  variant: 'neutral'  },
            { text: '+recharge', variant: 'negative' },
            { text: '+bruyant',  variant: 'negative' },
        ],
    },
    {
        name:     'Grenades incapacitantes',
        category: 'grenade',
        tags: [
            { text: '+assommant', variant: 'neutral'  },
            { text: '+proche',    variant: 'neutral'  },
            { text: '+zone',      variant: 'neutral'  },
            { text: '+recharge',  variant: 'negative' },
            { text: '+bruyant',   variant: 'negative' },
        ],
    },
    {
        name:     'Grenades à gaz',
        category: 'grenade',
        tags: [
            { text: '+assommant', variant: 'neutral'  },
            { text: '+proche',    variant: 'neutral'  },
            { text: '+zone',      variant: 'neutral'  },
            { text: '+gaz',       variant: 'neutral'  },
            { text: '+recharge',  variant: 'negative' },
        ],
    },

    // ── Armes blanches ───────────────────────────────────────────────────────
    {
        name:     'Couteau',
        category: 'arme_blanche',
        tags: [
            { text: '2-dégâts', variant: 'neutral' },
            { text: '+contact', variant: 'neutral' },
        ],
    },
    {
        name:     'Matraque',
        category: 'arme_blanche',
        tags: [
            { text: '2-dégâts', variant: 'neutral' },
            { text: '+contact', variant: 'neutral' },
        ],
    },
    {
        name:     'Épée ou machette',
        category: 'arme_blanche',
        tags: [
            { text: '3-dégâts', variant: 'neutral' },
            { text: '+contact', variant: 'neutral' },
            { text: '+carnage', variant: 'neutral' },
        ],
    },
    {
        name:     'Taser',
        category: 'arme_blanche',
        tags: [
            { text: '+assommant', variant: 'neutral'  },
            { text: '+contact',   variant: 'neutral'  },
            { text: '+recharge',  variant: 'negative' },
        ],
    },
    {
        name:     'Fouet à monofilament',
        category: 'arme_blanche',
        tags: [
            { text: '4-dégâts',   variant: 'neutral'  },
            { text: '+contact',   variant: 'neutral'  },
            { text: '+carnage',   variant: 'neutral'  },
            { text: '+zone',      variant: 'neutral'  },
            { text: '+dangereux', variant: 'negative' },
        ],
    },
    {
        name:     'Shurikens ou lames de jet',
        category: 'arme_blanche',
        tags: [
            { text: '2-dégâts', variant: 'neutral'  },
            { text: '+courte',  variant: 'neutral'  },
            { text: '+nombreux', variant: 'positive' },
        ],
    },

    // ── Protection ───────────────────────────────────────────────────────────
    {
        name:     'Vêtements renforcés',
        category: 'protection',
        tags: [
            { text: '0-armure',  variant: 'neutral'  },
            { text: '+discret',  variant: 'positive' },
        ],
    },
    {
        name:     'Veste de protection',
        category: 'protection',
        tags: [
            { text: '1-armure', variant: 'neutral' },
        ],
    },
    {
        name:     'Gilet pare-balles',
        category: 'protection',
        tags: [
            { text: '2-armure', variant: 'neutral' },
        ],
    },
    {
        name:     'Armure militaire',
        category: 'protection',
        tags: [
            { text: '3-armure',    variant: 'neutral'  },
            { text: '+encombrant', variant: 'negative' },
        ],
    },

    {
        name:     'Sniffer Wi-Fi (Dongle)',
        category: 'equipement',
        tags: [
            { text: '+discret',          variant: 'positive' },
            { text: '+détection réseau', variant: 'neutral'  },
        ],
    },
    {
        name:     'Injecteur de Virus physique',
        category: 'equipement',
        tags: [
            { text: '+usage unique',     variant: 'neutral'  },
            { text: '+1 continu piratage', variant: 'positive' },
            { text: '+furtif',           variant: 'positive' },
        ],
    },
    {
        name:     'Brouilleur de signal (Screamer)',
        category: 'equipement',
        tags: [
            { text: '+zone',             variant: 'neutral'  },
            { text: '+disruptif',        variant: 'positive' },
            { text: '+bruyant',          variant: 'negative' },
        ],
    },
    {
        name:     'Générateur de White Noise',
        category: 'equipement',
        tags: [
            { text: '+discret',          variant: 'positive' },
            { text: '+anti-espionnage',  variant: 'positive' },
        ],
    },

    // ── Matériel d'Infiltration & Entrée ─────────────────────────────────────
    {
        name:     'Pistolet à grappin magnétique',
        category: 'equipement',
        tags: [
            { text: '+rapide',           variant: 'positive' },
            { text: '+utilitaire',       variant: 'neutral'  },
        ],
    },
    {
        name:     'Découpeur thermique (Stylo)',
        category: 'equipement',
        tags: [
            { text: '+perforant',        variant: 'positive' },
            { text: '+silencieux',       variant: 'positive' },
            { text: '+consommable',      variant: 'negative' },
        ],
    },
    {
        name:     'Scanner biométrique de poche',
        category: 'equipement',
        tags: [
            { text: '+1 continu usurpation', variant: 'positive' },
        ],
    },
    {
        name:     'Balise traçante micro-adhésive',
        category: 'equipement',
        tags: [
            { text: '+discret',          variant: 'positive' },
            { text: '+tracé',            variant: 'neutral'  },
        ],
    },

    // ── Médical & Survie Avancée ──────────────────────────────────────────────
    {
        name:     'Airhypo (Injecteur rapide)',
        category: 'equipement',
        tags: [
            { text: '+rapide',           variant: 'positive' },
            { text: '+juiced',           variant: 'neutral'  },
        ],
    },
    {
        name:     'Masque à gaz filtrant',
        category: 'equipement',
        tags: [
            { text: '+protection gaz',   variant: 'positive' },
            { text: '+discret',          variant: 'positive' },
        ],
    },
    {
        name:     'Sac à cadavre "Cryo"',
        category: 'equipement',
        tags: [
            { text: '+encombrant',       variant: 'negative' },
            { text: '+convalescent',     variant: 'neutral'  },
            { text: '+préservation',     variant: 'positive' },
        ],
    },

    // ── Équipement ───────────────────────────────────────────────────────────

    {
        name:     'Kit d\'escalade',
        category: 'equipement',
        tags: [],
    },
    {
        name:     'Communicateur',
        category: 'equipement',
        tags: [],
    },
    {
        name:     'Kit de déguisement',
        category: 'equipement',
        tags: [
            { text: '+1 continu identité', variant: 'positive' },
        ],
    },
    {
        name:     'Traumapatch',
        category: 'equipement',
        tags: [
            { text: '+premiers soins', variant: 'positive' },
        ],
    },
    {
        name:     'Explosifs',
        category: 'equipement',
        tags: [
            { text: '+perforant',    variant: 'neutral'  },
            { text: '+carnage',      variant: 'neutral'  },
            { text: '+antiblindage', variant: 'neutral'  },
            { text: '+dangereux',    variant: 'negative' },
            { text: '+bruyant',      variant: 'negative' },
        ],
    },
    {
        name:     'Exosquelette gyroscopique',
        category: 'equipement',
        tags: [
            { text: '+stabilisation arme lourde', variant: 'positive' },
        ],
    },
    {
        name:     'Station de réparation microélectronique',
        category: 'equipement',
        tags: [
            { text: '+réparation terrain', variant: 'positive' },
        ],
    },
    {
        name:     'Matériel d\'enregistrement',
        category: 'equipement',
        tags: [
            { text: '+enregistrement', variant: 'neutral' },
            { text: '+audio',          variant: 'neutral' },
            { text: '+vidéo',          variant: 'neutral' },
        ],
    },
    {
        name:     'Combinaison de plongée',
        category: 'equipement',
        tags: [],
    },
    {
        name:     'Silencieux',
        category: 'equipement',
        tags: [
            { text: 'retire +bruyant et ajoute +silencieux sur une arme à feu (vous pouvez supprimer l\'item après)', variant: 'positive' },
        ],
    },
    {
        name:     'Combinaison furtive',
        category: 'equipement',
        tags: [
            { text: '+discrétion', variant: 'positive' },
        ],
    },
    {
        name:     'Salle de chirurgie portable',
        category: 'equipement',
        tags: [
            { text: '+blessures mortelles', variant: 'positive' },
            { text: '+implantation cyberware', variant: 'positive' },
        ],
    },
    {
        name:     'Trousse spécialisée',
        category: 'equipement',
        tags: [
            { text: '3 utilisations',   variant: 'neutral'  },
            { text: '+1 jet spécialité', variant: 'positive' },
        ],
    },
    {
        name:     'Traumapatch',
        category: 'equipement',
        tags: [
            { text: '+premiers soins urgence', variant: 'positive' },
        ],
    },
    {
        name:     'Kit médical d\'urgence',
        category: 'equipement',
        tags: [
            { text: '+premiers soins',   variant: 'positive' },
        ],
    },
    {
        name:     'Exosquelette gyroscopique',
        category: 'equipement',
        tags: [
            { text: '+stabilisation arme lourde', variant: 'positive' },
            { text: '+encombrant',       variant: 'negative' },
        ],
    },
    {
        name:     'Salle de chirurgie portable',
        category: 'equipement',
        tags: [
            { text: '+blessures mortelles',  variant: 'positive' },
            { text: '+implantation cyberware', variant: 'positive' },
            { text: '+encombrant',           variant: 'negative' },
        ],
    },
    {
        name:     'Dispositif d\'augmentation visuelle',
        category: 'equipement',
        tags: [],
    },
    {
        name:     'Combinaison ailée',
        category: 'equipement',
        tags: [],
    },
    // ── Véhicules ─────────────────────────────────────────────────────────────
    {
        name:     'Moto',
        category: 'vehicule',
        tags: [
            { text: '+rapide',      variant: 'positive' },
            { text: '+nerveux',     variant: 'positive' },
            { text: '+exigu',       variant: 'negative' },
            { text: '0-armure',     variant: 'neutral'  },
        ],
    },
    {
        name:     'Voiture',
        category: 'vehicule',
        tags: [
            { text: '+fiable',      variant: 'positive' },
            { text: '+spacieux',    variant: 'positive' },
            { text: '1-armure',     variant: 'neutral'  },
        ],
    },
    {
        name:     'Voiture de course',
        category: 'vehicule',
        tags: [
            { text: '+rapide',      variant: 'positive' },
            { text: '+performant',  variant: 'positive' },
            { text: '+fragile',     variant: 'negative' },
            { text: '0-armure',     variant: 'neutral'  },
        ],
    },
    {
        name:     'Voiture blindée',
        category: 'vehicule',
        tags: [
            { text: '+robuste',     variant: 'positive' },
            { text: '+blindé',      variant: 'positive' },
            { text: '+lent',        variant: 'negative' },
            { text: '2-armure',     variant: 'neutral'  },
        ],
    },
    {
        name:     'Van utilitaire',
        category: 'vehicule',
        tags: [
            { text: '+spacieux',    variant: 'positive' },
            { text: '+fiable',      variant: 'positive' },
            { text: '+quelconque',  variant: 'neutral'  },
            { text: '1-armure',     variant: 'neutral'  },
        ],
    },
    {
        name:     'Camion lourd',
        category: 'vehicule',
        tags: [
            { text: '+immense',     variant: 'neutral'  },
            { text: '+robuste',     variant: 'positive' },
            { text: '+lent',        variant: 'negative' },
            { text: '+gourmand',    variant: 'negative' },
            { text: '2-armure',     variant: 'neutral'  },
        ],
    },
    {
        name:     'AV (Aérovéhicule)',
        category: 'vehicule',
        tags: [
            { text: '+rapide',   variant: 'positive' },
            { text: '+voyant',   variant: 'negative' },
            { text: '+corpo',    variant: 'negative' },
            { text: '1-armure',  variant: 'neutral'  },
        ],
    },
    {
        name:     'Aéroglisseur',
        category: 'vehicule',
        tags: [
            { text: '+rapide',      variant: 'positive' },
            { text: '+tout-terrain',variant: 'positive' },
            { text: '+bruyant',     variant: 'negative' },
            { text: '0-armure',     variant: 'neutral'  },
        ],
    },
    {
        name:     'Bateau rapide',
        category: 'vehicule',
        tags: [
            { text: '+rapide',      variant: 'positive' },
            { text: '+nerveux',     variant: 'positive' },
            { text: '+capricieux',  variant: 'negative' },
            { text: '0-armure',     variant: 'neutral'  },
        ],
    },

    // ── Drones ────────────────────────────────────────────────────────────────
    {
        name:     'Drone de surveillance',
        category: 'drone',
        tags: [
            { text: '+menu',        variant: 'neutral'  },
            { text: '+rotor',       variant: 'neutral'  },
            { text: '+furtif',      variant: 'positive' },
            { text: '+zoom',        variant: 'positive' },
            { text: '+fragile',     variant: 'negative' },
        ],
    },
    {
        name:     'Drone de combat léger',
        category: 'drone',
        tags: [
            { text: '+standard',    variant: 'neutral'  },
            { text: '+rotor',       variant: 'neutral'  },
            { text: '+armé',        variant: 'positive' },
            { text: '+2-dégâts',    variant: 'neutral'  },
            { text: '+bruyant',     variant: 'negative' },
            { text: '+voyant',      variant: 'negative' },
        ],
    },
    {
        name:     'Drone de reconnaissance',
        category: 'drone',
        tags: [
            { text: '+minuscule',   variant: 'neutral'  },
            { text: '+rotor',       variant: 'neutral'  },
            { text: '+furtif',      variant: 'positive' },
            { text: '+thermographique', variant: 'positive' },
            { text: '+fragile',     variant: 'negative' },
        ],
    },
    {
        name:     'Drone terrestre',
        category: 'drone',
        tags: [
            { text: '+standard',    variant: 'neutral'  },
            { text: '+chenilles',   variant: 'neutral'  },
            { text: '+robuste',     variant: 'positive' },
            { text: '+tout-terrain',variant: 'positive' },
            { text: '+lent',        variant: 'negative' },
        ],
    },
    {
        name:     'Drone sous-marin',
        category: 'drone',
        tags: [
            { text: '+standard',    variant: 'neutral'  },
            { text: '+aquatique',   variant: 'neutral'  },
            { text: '+furtif',      variant: 'positive' },
            { text: '+sonar',       variant: 'positive' },
            { text: '+peu fiable',  variant: 'negative' },
        ],
    },
    {
        name:     'Drone lourd armé',
        category: 'drone',
        tags: [
            { text: '+grand',       variant: 'neutral'  },
            { text: '+rotor',       variant: 'neutral'  },
            { text: '+armé',        variant: 'positive' },
            { text: '+3-dégâts',    variant: 'neutral'  },
            { text: '+voyant',      variant: 'negative' },
            { text: '+bruyant',     variant: 'negative' },
        ],
    },
];

/**
 * Interprète le total 2d10 + modificateur selon les seuils The Sprawl.
 * @param {number} total
 * @returns {'success' | 'partial' | 'failure'}
 */
function getOutcome(total) {
    if (total >= SEUIL_SUCCES)  return 'success';
    if (total >= SEUIL_PARTIEL) return 'partial';
    return 'failure';
}

// ── Bloc dice — contrat diceEngine v2 ────────────────────────────────────────

const dice = {

    /**
     * Construit la notation rpg-dice-roller.
     * Appelé par le composant (MoveModal ou clic sur stat) AVANT roll().
     *
     * ctx.systemData doit contenir :
     *   - modifier  {number}  : valeur de stat + lien + saisie manuelle
     *   - useSynth  {boolean} : substitution Synth active
     *
     * @param {object} ctx
     * @returns {string} notation rpg-dice-roller
     */
    buildNotation(ctx) {
        const mod = ctx.systemData?.modifier ?? 0;
        if (mod === 0) return '2d10';
        if (mod > 0)   return `2d10+${mod}`;
        return `2d10${mod}`; // mod négatif → "2d10-2" par ex.
    },

    /**
     * Validation et enrichissement avant le roll.
     * Ici : rien à valider, on passe le ctx tel quel.
     */
    beforeRoll(ctx) {
        return ctx;
    },

    /**
     * Interprétation du raw après le roll.
     * raw.groups[0].values = [dé1, dé2]
     * raw.groups[0].total  = total lib (dés + modificateurs arithmétiques)
     *
     * @param {object} raw
     * @param {object} ctx
     * @returns {object} result
     */
    afterRoll(raw, ctx) {
        const group    = raw.groups[0];
        const diceVals = group.values;          // [dé1, dé2] — faces brutes
        const total    = group.total;           // total avec modificateur
        const modifier = ctx.systemData?.modifier ?? 0;
        const outcome  = getOutcome(total);
        const stat     = ctx.systemData?.stat   ?? null;
        const useSynth = ctx.systemData?.useSynth ?? false;

        return {
            // Données brutes
            diceVals,
            modifier,
            total,
            // Interprétation
            outcome,
            outcomeLabel: OUTCOME_LABEL[outcome],
            // Contexte du jet
            stat:        useSynth ? 'synth' : stat,
            moveName:    ctx.systemData?.moveName ?? null,
            // Transmis à persist
            flags:       raw.flags,
        };
    },

    /**
     * Construit la séquence d'animation pour diceAnimBridge.
     * 2 dés d10, couleur selon la stat.
     *
     * @param {object} raw
     * @param {object} ctx
     * @param {object} result
     * @returns {object} AnimationSequence
     */
    buildAnimationSequence(raw, ctx, result) {
        const stat   = result.stat ?? 'null';
        const color  = STAT_COLOR[stat] ?? 'default';
        const label  = result.moveName
            ? `${result.moveName}${stat ? ` (${STAT_LABEL[stat] ?? stat})` : ''}`
            : (STAT_LABEL[stat] ?? 'Jet libre');

        return {
            mode: 'single',
            groups: [{
                id:       'main',
                diceType: 'd10',
                color,
                label,
                waves: [{ dice: raw.groups[0].values }],
            }],
        };
    },

    /**
     * Rendu custom d'une entrée dans l'historique.
     * Affiche : move/stat + total + outcome pill + dés.
     *
     * @param {object} entry - entrée dice_history désérialisée
     * @returns {JSX.Element | null}
     */
    renderHistoryEntry: (entry) => <DiceEntryHistory roll={entry} />,
};

// ── Données statiques Playbooks ───────────────────────────────────────────────

export const PLAYBOOKS = [
    {
        id:          'Fixer',
        label:       'Fixer',
        description: 'Réseau, contacts, négociation, opérations en coulisses.',
        statHint:    'Privilégie Pro et Style.',
        cyberware:   ['Neuralink comm', 'Interface neurale + stockage', 'Yeux cybernétiques'],
        extraPicksOnMove: 'Chromé', // move qui donne +1 pick cyberware
        defaultPicks: 1,
    },
    {
        id:          'Netrunner',
        label:       'Netrunner',
        description: 'Intrusion dans le Net, cyberespace, guerre de l\'information.',
        statHint:    'Privilégie Synth et Esprit.',
        cyberware:   ['Cyberdeck intégré', 'Interface neurale + stockage', 'Neuralink comm', 'Yeux cybernétiques'],
        defaultPicks: 1,
        netrunnerNote: 'Cyberdeck externe = pas de slot cyberware utilisé.',
    },
    {
        id:          'Solo',
        label:       'Solo',
        description: 'Opérations terrain, infiltration, combat discret.',
        statHint:    'Privilégie Cran et Chair.',
        cyberware:   ['Skilljam', 'Interface neurale + stockage', 'Réflexes câblés', 'Oreilles cybernétiques', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Investigator',
        label:       'Investigator',
        description: 'Investigation, traque, surveillance, renseignement.',
        statHint:    'Privilégie Pro et Esprit.',
        cyberware:   ['Skilljam', 'Oreilles cybernétiques', 'Processeur tactique', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Nomad',
        label:       'Nomad',
        description: 'Conduite, véhicules, filatures, exfiltrations mobiles.',
        statHint:    'Privilégie Pro et Synth.',
        cyberware:   ['Interface neurale + module de contrôle à distance'],
        defaultPicks: 1,
        mandatoryCyberware: 'Interface neurale + module de contrôle à distance',
    },
    {
        id:          'Rockerboy',
        label:       'Rockerboy',
        description: 'Influence, charisme, idéologie, manipulation sociale.',
        statHint:    'Privilégie Style et Pro.',
        cyberware:   ['Armement incorporé', 'Neuralink comm', 'Interface neurale + stockage', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Media',
        label:       'Media',
        description: 'Information, investigation, exposition médiatique.',
        statHint:    'Privilégie Esprit et Style.',
        cyberware:   ['Braindance Recorder', 'Neuralink comm', 'Interface neurale + stockage', 'Oreilles cybernétiques', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Edgerunner',
        label:       'Edgerunner',
        description: 'Mercenaire augmenté, freelance, combat, tactique.',
        statHint:    'Privilégie Cran et Esprit.',
        cyberware:   ['Skilljam', 'Neuralink comm', 'Interface neurale + logiciel de visée', 'Processeur tactique', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Techie',
        label:       'Techie',
        description: 'Matériel, cyberware, équipement, ingénierie.',
        statHint:    'Privilégie Esprit et Synth.',
        cyberware:   ['Bras cybernétique', 'Neuralink comm', 'Interface neurale (stockage ou module)', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Assassin',
        label:       'Assassin',
        description: 'Neutralisation ciblée, élimination, fantôme.',
        statHint:    'Privilégie Cran et Style.',
        cyberware:   [
            'Armement incorporé', 'Sous-derme', 'Bras cybernétique',
            'Greffe musculaire', 'Interface neurale + logiciel de visée',
            'Réflexes câblés', 'Sandevistan', 'Slice \'N Dice', 'Yeux cybernétiques',
        ],
        defaultPicks: 1,
    },
];

export const TAG_SUGGESTIONS_BY_TYPE = {
    character: [
        { text: '+blessé',       variant: 'negative' },
        { text: '+amoché',       variant: 'negative' },
        { text: '+hémorragie',   variant: 'negative' },
        { text: '+flatline imminent', variant: 'negative' },
        { text: '+sonné',        variant: 'negative' },
        { text: '+endetté',      variant: 'negative' },
        { text: '+épuisé',       variant: 'negative' },
        { text: '+traumatisé',   variant: 'negative' },
        { text: '+convalescent', variant: 'neutral' },
        { text: '+juiced',       variant: 'neutral' },
        { text: '+paranoïaque',     variant: 'negative' },
        { text: '+dissocié',        variant: 'negative' },
    ],
    cyberware: [
        { text: '+défaillant',   variant: 'negative' },
        { text: '+dégradation',  variant: 'negative' },
        { text: '+douloureux',   variant: 'negative' },
        { text: '+aliénant',     variant: 'negative' },
        { text: '+médiocre',     variant: 'negative' },
        { text: '+crypté',       variant: 'positive' },
        { text: '+furtif',       variant: 'positive' },
        { text: '+modifié',      variant: 'neutral'  },
    ],
    relation: [
        { text: '+dette',        variant: 'negative' },
        { text: '+compromis',    variant: 'negative' },
        { text: '+menacé',       variant: 'negative' },
        { text: '+disparu',      variant: 'negative' },
        { text: '+fiable',       variant: 'positive' },
        { text: '+allié',        variant: 'positive' },
        { text: '+redevable',    variant: 'positive' },
        { text: '+suspect',      variant: 'neutral'  },
        { text: '+flatlined',    variant: 'negative'  },
    ],
    item: [
        { text: '+défaillant',   variant: 'negative' },
        { text: '+dégradé',      variant: 'negative' },
        { text: '+volé',         variant: 'negative' },
        { text: '+tracé',        variant: 'negative' },
        { text: '+modifié',      variant: 'neutral'  },
        { text: '+rare',         variant: 'positive' },
        { text: '+militaire',    variant: 'neutral'  },
        { text: '+illégal',      variant: 'negative' },
        { text: '+biométrique',  variant: 'neutral' },
        { text: '+smartlink',    variant: 'neutral' },
        { text: '+jetable',      variant: 'neutral' },
    ],
};

// Profils de répartition des stats à la création
export const STAT_PROFILES = [
    {
        id:          'A',
        label:       'Profil A — Un seul point faible, moins de force',
        description: '+2 / +1 / 0 / 0 / 0 / -2',
        values:      [2, 1, 0, 0, 0, -2],
    },
    {
        id:          'B',
        label:       'Profil B — Deux points faibles, plus de force globale',
        description: '+2 / +1 / +1 / 0 / -1 / -2',
        values:      [2, 1, 1, 0, -1, -2],
    },
];

export const STATS = ['cran', 'pro', 'chair', 'esprit', 'style', 'synth'];
export const STAT_LABELS = STAT_LABEL;

// Directives personnelles disponibles
export const DIRECTIVES_PERSONNELLES = [
    { id: 'ambitieux',    label: 'Ambitieux',    hasBlank: true,  blankHint: 'Au sein de ___' },
    { id: 'celebre',      label: 'Célèbre',       hasBlank: false },
    { id: 'compatissant', label: 'Compatissant',  hasBlank: false },
    { id: 'filial',       label: 'Filial',        hasBlank: true,  blankHint: 'Conseils de ___' },
    { id: 'fureteur',     label: 'Fureteur',      hasBlank: true,  blankHint: 'À propos de ___' },
    { id: 'intime',       label: 'Intime',        hasBlank: true,  blankHint: 'Mon ami ___' },
    { id: 'masochiste',   label: 'Masochiste',    hasBlank: false },
    { id: 'motive',       label: 'Motivé',        hasBlank: true,  blankHint: 'Mon code de conduite : ___' },
    { id: 'partisan',     label: 'Partisan',      hasBlank: true,  blankHint: 'Appartenance à ___' },
    { id: 'proselyte',    label: 'Prosélyte',     hasBlank: false },
    { id: 'protecteur',   label: 'Protecteur',    hasBlank: true,  blankHint: 'Responsabilités envers ___' },
    { id: 'prudent',      label: 'Prudent',       hasBlank: false },
    { id: 'rejete',       label: 'Rejeté',        hasBlank: true,  blankHint: 'Ancienne appartenance à ___' },
    { id: 'trompeur',     label: 'Trompeur',      hasBlank: false },
    { id: 'venal',        label: 'Vénal',         hasBlank: false },
    { id: 'vengeur',      label: 'Vengeur',       hasBlank: true,  blankHint: 'Nuire à ___' },
    { id: 'violent',      label: 'Violent',       hasBlank: false },
];

// ── Export config principal ───────────────────────────────────────────────────

const cyberpunkConfig = {
    slug:  'cyberpunk',
    label: 'Cyberpunk',
    dice,
    diceConfigDefault: {
        mode:   'custom',
        custom: {
            foreground: '#00e5ff',
            background: '#050508',
            outline:    '#ff2d78',
            edge:       '#001a20',
            texture:    '',
            material:   'metal',
        },
        lightColor:       '#00e5ff',
        strength:         6,
        gravity:          400,
        sounds:           false,
        animationEnabled: true,
    },
};

export default cyberpunkConfig;