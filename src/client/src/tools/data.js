// data.js - Données complètes du jeu (CANON INTÉGRAL)

// ============================================
// COMPÉTENCES (35 compétences)
// ============================================

export const COMPETENCES = [
    { 
        name: "Combat CàC armé",
        caracs: ["force", "agilite"],
        description: "Votre aisance au combat avec une arme déterminée de corps à corps (cf les notes). Cette compétence est cumulable pour plusieurs armes différentes. Vous permet aussi d'effectuer des parades en combat (bonus au SEUIL)"
    },
    {
        name: "Combat CàC non armé",
        caracs: ["force", "agilite"],
        description: "Votre aisance au combat à main nue. Permet d'effectuer des esquives (bonus au SEUIL)"
    },
    { 
        name: "Combat à distance", 
        caracs: ["agilite", "perception"],
        description: "Manier l'arc, la fronde, lancer javelot ou hache. Toucher une cible éloignée avec précision."
    },
    { 
        name: "Langue orale", 
        caracs: ["intelligence", "charisme"],
        description: "Identique à l'écrit mais concerne l'oral. On considère toujours que vous savez vous exprimez et vous faire comprendre de vos contemporains. En revanche la langue peut aussi être une barrière si vous êtes dans un pays étranger. Compétence cumulable pour d'autres langues. Nécessite une justification RP."
    },
    {
        name: "Langue écrite",
        caracs: ["intelligence", "intelligence"],
        description: "Compétence déterminant votre compréhension d'une langue écrite autre que les runes (cf page des runes). Compétence cumulable pour différentes langues. Nécessite une justification RP."
    },
    {
        name: "Divination",
        caracs: ["chance", "chance"],
        description: "Vous êtes une passerelle entre les Hommes et les Dieux. De ce fait les Dieux vous permettent d'avoir des visions du futur ou encore une compréhension plus globale d'une situation. Parfois les Dieux vous confient leurs secrets."
    },
    {
        name: "Loi", 
        caracs: ["intelligence", "intelligence"],
        description: "Connaître les lois, coutumes et précédents juridiques. Plaider une cause au Thing, arbitrer des conflits."
    },
    { 
        name: "Folklore", 
        caracs: ["intelligence", "chance"],
        description: "Connaître les mythes, sagas, légendes, généalogies des Jarls et récits des Dieux."
    },
    {
        name: "Herboriste",
        caracs: ["intelligence", "agilite"],
        description: "Connaissances des plantes et de leurs pouvoirs. Il ne s'agit pas d'une compétence de soins !"
    },
    { 
        name: "Traque/Chasse", 
        caracs: ["perception", "intelligence"],
        description: "Pister, chasser, poser des pièges, lire les traces d'animaux ou d'hommes."
    },
    { 
        name: "Docteur", 
        caracs: ["intelligence", "chance"],
        description: "Détermine votre aptitude à soigner les blessures de tout type, une connaissance accru des plantes est un plus."
    },
    { 
        name: "Ferronnerie", 
        caracs: ["agilite", "agilite"],
        description: "Aptitude du joueur à forger des armes et des armures pour le combat et le pillage. Permet aussi de réparer des pièces d'armures ou des armes endommagés."
    },
    { 
        name: "Connaissance Outgard", 
        caracs: ["intelligence", "intelligence"],
        description: "Savoir sur les autres peuples : Saxons, Francs, Celtes, Slaves. Leurs croyances, coutumes, langues."
    },
    { 
        name: "Ombre", 
        caracs: ["agilite", "agilite"],
        description: "Se déplacer sans bruit, se fondre dans l'obscurité, éviter d'être repéré."
    },
    { 
        name: "Survie", 
        caracs: ["intelligence", "intelligence"],
        description: "Se débrouiller en nature : faire feu, trouver nourriture, construire abri, s'orienter."
    },
    { 
        name: "Raquette", 
        caracs: ["agilite", "agilite"],
        description: "Se déplacer sur neige profonde avec raquettes sans s'enfoncer ni s'épuiser."
    },
    { 
        name: "Amis des animaux", 
        caracs: ["charisme", "charisme"],
        description: "Communiquer avec animaux, comprendre leurs intentions, gagner leur confiance, être averti d'un danger."
    },
    { 
        name: "Orfèvre", 
        caracs: ["agilite", "intelligence"],
        description: "Créer bijoux précieux : modèle en cire, moule en terre, coulée d'or ou argent."
    },
    { 
        name: "Potier", 
        caracs: ["agilite", "intelligence"],
        description: "Manier l'argile, façonner récipients, amphores, objets du quotidien."
    },
    { 
        name: "Bûcheron", 
        caracs: ["intelligence", "force"],
        description: "Choisir arbres, les abattre proprement, faire offrandes aux Dieux, transporter troncs."
    },
    { 
        name: "Charpentier marine", 
        caracs: ["agilite", "intelligence"],
        description: "Votre compétence à la création et l'entretient des langskip. Cela va de la sélection du bois en passant par la coupe et l'assemblage du bateau. Un bon charpentier de marine est généralement aussi un bon marin et ne souffre pas du mal de mer."
    },
    { 
        name: "Fermier", 
        caracs: ["intelligence", "force"],
        description: "Retourner terre, planter, récolter, nourrir famille. Préparer hydromel et bières."
    },
    { 
        name: "Charpentier", 
        caracs: ["intelligence", "force"],
        description: "Bâtir maisons durables : choix arbres, charpente, toiture, assemblage."
    },
    { 
        name: "Pillage", 
        caracs: ["perception", "chance"],
        description: "Trouver objets de valeur dans habitations, repérer cachettes, dénicher trésors."
    },
    { 
        name: "Danse", 
        caracs: ["agilite", "agilite"],
        description: "Qualité du jeu de jambes lors des fêtes et soirées alcoolisées."
    },
    { 
        name: "Jeu", 
        caracs: ["chance", "intelligence"],
        description: "Expertise aux jeux de hasard et stratégie (hnefatafl, dés) joués l'hiver."
    },
    { 
        name: "Pêche", 
        caracs: ["chance", "agilite"],
        description: "Appâter poisson, connaître bons coins. Immunité au mal de mer."
    },
    { 
        name: "Sculpteur", 
        caracs: ["agilite", "agilite"],
        description: "Sculpter pièces en bois, créer couverts, objets décoratifs, mâts de navire."
    },
    { 
        name: "Navigation", 
        caracs: ["intelligence", "chance"],
        description: "Piloter bateau dans direction voulue, lire étoiles et vents, éviter récifs."
    },
    { 
        name: "Mineur", 
        caracs: ["intelligence", "force"],
        description: "Localiser minerai, extraire fer ou métaux précieux, soutenir galeries."
    },
    {
        name: "Escalade",
        caracs: ["agilite", "force"],
        description: "Vous savez reconnaître les bonnes prises des mauvaises et utiliser votre savoir faire pour gravir des parois verticale ou des chemin très escarpés."
    },
    {
        name: "Intimidation",
        caracs: ["charisme", "force"],
        description: "Vous savez utiliser le langage corporel pour intimider les autres et vous servez de votre physique pour faire passer des messages simple.. comme \"si tu continues... je te pète la gueule\""
    },
    {
        name: "Chant",
        caracs: ["charisme", "chance"],
        description: "Détermine si vous chantez comme un canard boiteux ou comme une Diva. Permet aussi de chanter les runes (en combat ou non)."
    },
    {
        name: "Marchandage",
        caracs: ["charisme", "perception"],
        description: "Votre compétence à négocier le bon prix lors d'un achat ou d'une vente. Etre un fin marchand est un véritable art."
    },
    { 
        name: "Larcin", 
        caracs: ["agilite", "perception"],
        description: "Voler bourse, crocheter serrure rudimentaire, tours de passe-passe, tricher aux jeux."
    },
    { 
        name: "Dressage", 
        caracs: ["charisme", "force"],
        description: "Soumettre la volonté d'un animal (chien, faucon, cheval) pour qu'il obéisse à des ordres complexes, au-delà de la simple amitié."
    },
    { 
        name: "Cuisine", 
        caracs: ["intelligence", "perception"],
        description: "Préparer gibier, reconnaître ingrédients comestibles, cuisiner repas qui remonte moral."
    },
    { 
        name: "Brasseur", 
        caracs: ["intelligence", "agilite"],
        description: "L'art complexe de la fermentation de haute qualité. Bien au-delà du tord-boyaux fermier, vous créez des hydromels et bières d'exception."
    },
    { 
        name: "Couture", 
        caracs: ["intelligence", "agilite"],
        description: "Maîtrise art textile : tissage, teinture, coupe, assemblage. Protéger du froid, afficher rang social."
    }
];

// ============================================
// TRAITS ET BACKGROUNDS (60+ traits)
// ============================================

export const TRAITS = [
    {
        name: "Bons réflexes",
        description: "Vous avez naturellement d'excellents réflexes et pouvez réagir avec une rapidité surprenante, même lorsque vous êtes pris au dépourvu.",
        effects: { actions: 1 },
        requirements: { agilite: 3 },
        incompatible: []
    },
    {
        name: "Peau dure",
        description: "Après avoir passé de longues périodes à affronter les éléments en extérieur, votre peau s'est tannée et endurcie, vous offrant une protection naturelle.",
        effects: { armure: 1 },
        requirements: { force: 2, agilite: 2 },
        incompatible: ["Tatouage", "Sang de troll", "Survivant miraculeux"]
    },
    {
        name: "Vue perçante",
        description: "Votre acuité visuelle est bien supérieure à la moyenne. Vous voyez plus loin que quiconque et les détails les plus infimes ne vous échappent pas.",
        effects: { description: "Pas de malus lié à la distance" },
        requirements: { perception: 2 },
        incompatible: ["Aveugle", "Borgne", "Enfant des nuits blanches", "Enfant de l'hiver noir"]
    },
    {
        name: "Aveugle",
        description: "Que ce soit une punition ou une épreuve divine, vous avez perdu la vue. En contrepartie, vos autres sens se sont aiguisés pour compenser ce handicap.",
        effects: { description: "Échec auto Perception (vue). +1 succès auto sur les autres sens" },
        requirements: { perception: 2, agilite: 2 },
        incompatible: ["Vue perçante", "Borgne", "Marin", "Huskarl", "Leader né", "Berserk", "Tatouage", "Foudre de guerre", "Duelliste"]
    },
    {
        name: "Foudre de guerre",
        description: "Le combat est une seconde nature pour vous. Quelle que soit l'arme en main, vous êtes dangereux, mais vous devenez un véritable maître avec vos armes de prédilection.",
        effects: { actions: 1, description: "Pas de malus de localisation" },
        requirements: { force: 2, agilite: 2 },
        requiresSkill: { "Combat CàC": 2 },
        incompatible: ["Aveugle", "Huskarl", "Leader né", "Godi", "Insaisissable"]
    },
    {
        name: "Tatouage",
        description: "Votre corps est couvert de motifs complexes qui effraient les chrétiens et les âmes sensibles, tout en vous assurant la bénédiction des Dieux. Certains motifs peuvent receler des pouvoirs cachés.",
        effects: { description: "Intimidation chrétien (+1 suc auto), Chance (+1 suc auto)" },
        requirements: { charisme: 2 },
        incompatible: ["Peau dure", "Aveugle"]
    },
    {
        name: "Borgne",
        description: "Vous avez sacrifié un œil (ou l'avez perdu au combat). Cette blessure inspire la crainte ou le respect, car beaucoup y voient la marque d'Odin lui-même et vous pensent sous protection divine.",
        effects: { description: "Intimidation (+1 suc auto), Perception (-1 suc auto)", sagaBonus: 1 },
        requirements: { force: 2, charisme: 2 },
        incompatible: ["Aveugle", "Vue perçante"]
    },
    {
        name: "Huskarl",
        description: "Vous avez juré fidélité à un Jarl ou un Roi. En tant que garde du corps d'élite, vos réflexes sont conditionnés pour protéger votre seigneur, ce qui limite parfois votre liberté de mouvement.",
        effects: { actions: 1, description: "Arme 1 main+bouclier (+1 suc auto)" },
        requirements: { force: 2 },
        requiresSkill: { "Combat CàC": 2 },
        incompatible: ["Aveugle", "Foudre de guerre", "Skald", "Vaurien"]
    },
    {
        name: "Volva",
        description: "Vous possédez la rare connaissance des runes et savez manipuler le heidl pour éveiller leur magie. Souvent craint et respecté, cet art est traditionnellement féminin. Vous savez enchanter des objets ou lancer des rituels.",
        effects: { description: "Chance (+1 suc auto)", runePoints: 8 },
        requirements: { chance: 2 },
        requiresSkill: { "Divination": 3, "Folklore": 2 },
        incompatible: ["Foudre de guerre", "Huskarl", "Berserk", "Marin", "Godi"]
    },
    {
        name: "Berserk",
        description: "Guerrier-fauve voué à Odin, vous combattez torse nu ou vêtu d'une simple peau de bête. Vous pouvez entrer dans une transe furieuse où la douleur n'existe plus, frappant tout ce qui bouge, ami comme ennemi.",
        effects: { description: "Transe (5 tours): Action +2, Armure +2, SEUIL +1, Arme 2 mains (+2 suc auto), ignore douleur. Fin: 4 tokens fatigue. Test Chance pour ciblage." },
        requirements: { force: 2, chance: 2 },
        incompatible: ["Aveugle", "Huskarl", "Leader né", "Godi", "Volva", "Marin", "Insaisissable", "Sang de troll", "Sous le regard de Tyr"]
    },
    {
        name: "Skald",
        description: "Gardien de la mémoire et poète, vous connaissez de nombreuses sagas que vous narrez lors des banquets, toujours accompagné d'une bonne corne de bière.",
        effects: { description: "Charisme (+1 suc auto), Folklore (+1 suc auto)" },
        requiresSkill: { "Folklore": 2 },
        incompatible: ["Berserk", "Huskarl", "Langue de serpent", "Sang de troll", "Porte-poisse", "Né sous mauvais augure"]
    },
    {
        name: "Taille imposante",
        description: "Vous êtes une montagne de muscles, bien plus grand et massif que vos contemporains, ce qui suffit souvent à calmer les ardeurs adverses.",
        effects: { description: "Intimidation (+1 suc auto)" },
        requirements: {},
        incompatible: ["Insaisissable"]
    },
    {
        name: "Marin",
        description: "La mer est votre véritable foyer. Vous ne souffrez ni du mal de mer, ni de la promiscuité à bord, et ignorez le tangage. Vous savez entretenir un navire instinctivement.",
        effects: { actions: 1, description: "Action +1 (en mer), Charpentier marine (+1 suc auto)" },
        requirements: { force: 2, agilite: 2 },
        requiresSkill: { "Combat CàC": 1 },
        incompatible: ["Volva", "Aveugle", "Berserk"]
    },
    {
        name: "Leader né",
        description: "Guerrier charismatique, vous maîtrisez les runes orales (Galdr) pour hurler des ordres qui galvanisent vos troupes ou terrifient vos ennemis au cœur de la mêlée.",
        effects: { actions: 1, runePoints: 3 },
        requirements: { charisme: 2 },
        incompatible: ["Berserk", "Aveugle", "Godi", "Foudre de guerre", "Duelliste"]
    },
    {
        name: "Godi",
        description: "Expert des lois et prêtre respecté, votre impartialité est renommée. Les nobles vous consultent pour les querelles et vous êtes habitué à parler devant le Thing et les Dieux.",
        effects: { description: "Loi (+1 suc auto), Charisme (+1 suc auto)" },
        requiresSkill: { "Loi": 2 },
        requiresSaga: 1,
        incompatible: ["Berserk", "Volva", "Foudre de guerre", "Leader né", "Langue de serpent", "Vaurien", "Duelliste", "Sous le regard d'Odin", "Sous le regard de Thor", "Sous le regard de Tyr", "Sous le regard de Freyr", "Sous le regard de Freyja", "Sous le regard de Loki"]
    },
    {
        name: "Impistable",
        description: "Fantôme des bois, vous avez appris à ne laisser aucune trace derrière vous et savez parfaitement effacer celles de vos compagnons.",
        effects: { description: "+2 succès lors de traque (défense)" },
        requiresSkill: { "Traque/Chasse": 2 },
        incompatible: []
    },
    {
        name: "Grande concentration",
        description: "Rien ne peut perturber votre esprit. Vous restez focalisé sur votre tâche quel que soit le chaos environnant.",
        effects: { description: "+1 succès auto sur une compétence de votre choix" },
        requirements: {},
        incompatible: []
    },
    {
        name: "Infatigable",
        description: "Vous semblez inépuisable. Même exténué, vous tenez bon. Vous supportez les longues nuits de veille bien mieux que le commun des mortels.",
        effects: { description: "Pas de malus lié à la fatigue" },
        requirements: {},
        incompatible: []
    },
    {
        name: "Force de géant",
        description: "On vous dit descendant des Jötnar. Sans être nécessairement plus musclé, vous soulevez sans effort des charges qui briseraient le dos de deux hommes normaux.",
        effects: { description: "Force (+2 suc auto)" },
        requirements: { force: 2 },
        incompatible: ["Grand guérisseur", "Insaisissable"]
    },
    {
        name: "Virtuose de l'arc",
        description: "Votre maîtrise est telle que l'encochage, la visée et le tir ne forment qu'un seul mouvement fluide et mortel.",
        effects: { description: "Viser devient une action gratuite" },
        requiresSkill: { "Combat à distance": 3 },
        incompatible: []
    },
    {
        name: "Sanglant",
        description: "Vous avez la fâcheuse tendance à démembrer vos ennemis. Vos exactions rendent les cadavres méconnaissables et vous donnent une réputation terrifiante.",
        effects: { description: "+1 token blessure sur dégâts, Charisme (-1 suc auto)", sagaBonus: 1 },
        requirements: { force: 3 },
        incompatible: ["Grand guérisseur", "Lien avec les Landvættir", "Sous le regard de Freyr"]
    },
    {
        name: "Ancien esclave",
        description: "Vous avez connu les fers et acheté votre liberté à la sueur de votre front. Vous savez survivre avec rien et endurez la misère mieux que les nés-libres.",
        effects: { description: "Survie (+1 suc auto), Chance (-1 suc auto)" },
        requirements: {},
        incompatible: ["Noble lignée", "Dernier de la lignée", "Bâtard reconnu", "Orphelin aguerri", "Marqué par les Nornes"]
    },
    {
        name: "Noble lignée",
        description: "Le sang des Jarls coule dans vos veines. Même si votre famille a perdu son influence, vous gardez une prestance et un statut naturel qui imposent le respect.",
        effects: { description: "Charisme (+1 suc auto)", sagaBonus: 1 },
        requirements: {},
        incompatible: ["Berserk", "Ancien esclave", "Langue de serpent", "Dette de sang", "Serment rompu", "Porte-poisse", "Marqué par les Nornes", "Né sous mauvais augure", "Dernier de la lignée", "Bâtard reconnu", "Orphelin aguerri", "Sang de troll"]
    },
    {
        name: "Grand guérisseur",
        description: "Formé à soigner les plaies de guerre les plus hideuses, vous avez acquis votre renommée en sauvant la vie d'un personnage important.",
        effects: { description: "Soin (-1 tokens de blessure gratuit)", sagaBonus: 1 },
        requiresSkill: { "Docteur": 2 },
        incompatible: ["Force de géant", "Sanglant", "Duelliste", "Serment rompu", "Porte-poisse", "Né sous mauvais augure"]
    },
    {
        name: "Ambidextre",
        description: "Vous ne faites aucune différence entre votre main gauche et votre main droite, capable de manier deux armes avec une efficacité redoutable.",
        effects: { actions: 1, description: "Combat 2 armes à une main possible" },
        requirements: {},
        incompatible: []
    },
    {
        name: "Langue de serpent",
        description: "Menteur pathologique et séducteur invétéré, vous n'avez aucun scrupule à manipuler les gens. Votre éloquence est votre meilleure arme.",
        effects: { description: "Charisme (+2 suc auto)" },
        requirements: { agilite: 2},
        incompatible: ["Noble lignée", "Skald", "Godi", "Tueur de monstre", "Sous le regard de Tyr", "Connaissance des runes", "Vaurien"]
    },
    {
        name: "Sommeil léger",
        description: "Vous ne dormez jamais vraiment. Toujours sur le qui-vive, le moindre craquement de brindille suffit à vous réveiller prêt au combat.",
        effects: { description: "Perception (+1 suc auto la nuit)" },
        requirements: {},
        incompatible: ["Rêveur prophétique"]
    },
    {
        name: "Campeur",
        description: "Vous vivez en harmonie avec la nature, capable de dormir n'importe où et de vous nourrir de ce que la forêt vous offre.",
        effects: { description: "Survie (+1 suc auto), Chance (+1 suc auto)" },
        requiresSkill: { "Survie": 1 },
        incompatible: []
    },
    {
        name: "Duelliste",
        description: "Habitué des Holmgang, vous utilisez le défi rituel pour dépouiller vos adversaires. Votre entraînement est spécifique au combat singulier.",
        effects: { description: "Combat CàC (+1 suc auto)" },
        requirements: {},
        incompatible: ["Noble lignée", "Skald", "Godi", "Grand guérisseur", "Leader né", "Volva", "Aveugle"]
    },
    {
        name: "Boxeur",
        description: "Vous vous battez à mains nues depuis l'enfance. Vous savez où frapper pour briser les os et assommer rapidement vos adversaires.",
        effects: { description: "Combat sans arme (+1 suc auto). KO auto sur seuil+1" },
        requirements: {},
        incompatible: []
    },
    {
        name: "Divorcé",
        description: "Votre mariage arrangé fut un échec retentissant. L'union a été dissoute pour incompatibilité, vous laissant une certaine débrouillardise solitaire.",
        effects: { description: "Survie (+1 suc auto)" },
        requirements: {},
        incompatible: ["Veuf/Veuve"]
    },
    {
        name: "Sens de l'orientation",
        description: "Les étoiles et le soleil sont vos guides. Vous savez instinctivement où se trouve le Nord et comment diriger un navire vers sa destination.",
        effects: { actions: 1, description: "Navigation (+1 suc auto), Action (en mer) +1" },
        requirements: {},
        incompatible: []
    },
    {
        name: "Rameur fou",
        description: "Vous êtes une machine inépuisable sur un banc de nage. Vous propulsez le navire plus vite et maniez la rame comme une arme contondante.",
        effects: { description: "+3km/h lorsque vous ramez" },
        requirements: { force: 2 },
        incompatible: []
    },
    {
        name: "Banni",
        description: "Jugé coupable par le Thing, vous êtes un hors-la-loi. Vous ne pouvez revenir sur vos terres natales qu'en conquérant, ce qui vous a appris à survivre en marge.",
        effects: { description: "Survie (+1 suc auto)", sagaBonus: 1 },
        requirements: { chance: 1 },
        incompatible: []
    },
    {
        name: "Troublé",
        description: "Un mal inconnu ronge votre esprit. Entre pertes de mémoire et confusion, vous êtes assailli de visions prophétiques que vous ne contrôlez pas.",
        effects: { description: "+1 succès difficulté, Divination (+2 succès auto)" },
        requirements: {},
        incompatible: []
    },
    {
        name: "Veuf/Veuve",
        description: "Votre moitié a quitté ce monde, vous laissant seul(e). Parfois, vous sentez que son fantôme veille encore sur vous ou vous hante.",
        effects: { description: "Survie (+1 suc auto), Chance (-1 suc auto)" },
        requirements: {},
        incompatible: ["Divorcé"]
    },
    {
        name: "Fin négociant",
        description: "Marchand vétéran, vous avez l'œil pour estimer la valeur des choses. Vous savez exactement quand conclure une affaire ou quand partir en courant.",
        effects: { description: "Marchandage (+1 suc auto)" },
        requiresSkill: { "Marchandage": 1 },
        incompatible: []
    },
    {
        name: "Vaurien",
        description: "La ruse et la tromperie coulent dans vos veines. Vous savez mentir avec un aplomb tel que même les Dieux pourraient vous croire.",
        effects: { description: "Larcin (+1 suc auto), Langue Orale - Mentir (+1 suc auto)" },
        requiresSkill: { "Larcin": 2 },
        incompatible: ["Godi", "Leader né", "Huskarl", "Langue de serpent", "Connaissance des runes"]
    },
    {
        name: "Maître des bêtes",
        description: "Vous imposez votre dominance aux animaux. Vous commencez le jeu avec un animal fidèle (chien, faucon...) validé par le MJ.",
        effects: { description: "Dressage (+1 suc auto). Le compagnon agit à votre Initiative (1 Action propre)" },
        requiresSkill: { "Dressage": 2, "Amis des animaux": 1 },
        incompatible: []
    },
    {
        name: "Briseur de boucliers",
        description: "Votre style brutal vise à détruire la protection adverse. Vous savez exactement où frapper pour faire éclater le bois.",
        effects: { description: "Dégâts +1 Token contre boucliers. Si bouclier détruit: Intimidation (+1 suc auto) gratuit" },
        requirements: { force: 3 },
        incompatible: []
    },
    {
        name: "Insaisissable",
        description: "Anguille sur le champ de bataille, vous misez tout sur la mobilité, refusant les armures lourdes qui vous ralentiraient.",
        effects: { seuil: 1, description: "Si Armure légère/nulle: SEUIL +1 contre CàC" },
        requirements: { agilite: 3 },
        incompatible: ["Peau dure", "Berserk", "Huskarl", "Force de géant", "Foudre de guerre", "Taille imposante"]
    },
    {
        name: "Sang de troll",
        description: "On murmure que votre lignée est souillée. Laid, peau grisâtre, vous effrayez les gens mais vos plaies se referment à une vitesse surnaturelle.",
        effects: { armure: 1, description: "Armure +1. Récupération Blessure divisée par 2. Charisme (-1 suc auto)" },
        requirements: { force: 3 },
        incompatible: ["Noble lignée", "Skald", "Berserk", "Peau dure", "Marqué par les Nornes"]
    },
    {
        name: "Sang de glace",
        description: "L'hiver est votre élément. Le froid mordant ne vous atteint pas, là où d'autres mourraient gelés.",
        effects: { description: "Immunisé malus/dégâts du froid naturel. Survie en hiver (+1 suc auto)" },
        requiresSkill: { "Survie": 2 },
        incompatible: []
    },
    {
        name: "Connaissance des runes",
        description: "Vous avez appris ou avez eu une révélation pendant un rêve sur la signification et l'utilisation des Runes. Votre savoir vous permet de maîtriser en partie les runes et leurs pouvoirs.",
        effects: { runePoints: 5 },
        requiresSkill: { "Folklore": 3 },
        incompatible: ["Langue de serpent", "Vaurien"]
    },
    {
        name: "Marqué par les Nornes",
        description: "Une marque physique singulière (difformité, tache de naissance, hétérochromie, six doigts) présente depuis ta naissance trahit que les Nornes ont tissé un destin exceptionnel pour toi. Tu es promis à la grandeur ou à la tragédie, mais jamais à l'oubli.",
        effects: { sagaBonus: 2, description: "Chance (+1 suc auto), Charisme (-1 suc auto). Obligation narrative MJ" },
        requirements: {},
        incompatible: ["Ancien esclave", "Sang de troll", "Noble lignée", "Né sous mauvais augure", "Porte-poisse"]
    },
    {
        name: "Né sous mauvais augure",
        description: "Ta naissance fut accompagnée de présages funestes : éclipse, corbeau mort sur le seuil, mère morte en couches. Les völvas murmurent ton nom avec inquiétude.",
        effects: { description: "Chance (+1 suc auto), Charisme (-1 suc auto), Intimidation (+1 suc auto)" },
        requirements: {},
        incompatible: ["Marqué par les Nornes", "Noble lignée", "Skald", "Grand guérisseur", "Porte-poisse"]
    },
    {
        name: "Rêveur prophétique",
        description: "Tes rêves sont d'une précision troublante. Tu as rêvé de la mort d'un voisin la veille de sa noyade, du retour d'un raid avant que le drakkar soit visible.",
        effects: { description: "1 fois/session: Pressentiment. MJ donne indice vague mais vrai. Perception (+1 suc auto). +1 Token Fatigue/nuit (sommeil agité)" },
        requirements: { perception: 2 },
        incompatible: ["Sommeil léger"]
    },
    {
        name: "Survivant miraculeux",
        description: "Tu as survécu à quelque chose qui aurait dû te tuer : noyade, incendie, chute de falaise, massacre. Ton corps porte les cicatrices mais ton esprit refuse de céder.",
        effects: { armure: 1, description: "Armure +1 (peau endurcie), Survie (+1 suc auto)", sagaBonus: 1 },
        requirements: { force: 2, chance: 2 },
        incompatible: ["Peau dure"]
    },
    {
        name: "Porte-poisse",
        description: "Les malheurs semblent te coller à la peau. Deux compagnons sont morts à tes côtés. La ferme a brûlé. Le bateau a coulé. Toi, tu survies toujours.",
        effects: { description: "Charisme (-2 suc auto), Chance (+2 suc auto). Tu survies, mais les autres attirent le malheur" },
        requirements: {},
        incompatible: ["Noble lignée", "Skald", "Grand guérisseur", "Marqué par les Nornes", "Né sous mauvais augure"]
    },
    {
        name: "Tueur de monstre",
        description: "Tu as tué une créature légendaire : ours colossal, loup immense aux yeux de braise, géant de glace. Tu portes un trophée bien visible.",
        effects: { description: "Intimidation (+1 suc auto)", sagaBonus: 1 },
        requirements: { force: 3 },
        requiresSkill: { "Combat CàC": 3 },
        incompatible: ["Langue de serpent"]
    },
    {
        name: "Sous le regard d'Odin",
        description: "Le Père-de-Tout semble t'observer. Les corbeaux te suivent, tes intuitions se révèlent justes. Coïncidence ou faveur du dieu borgne ?",
        effects: { description: "Intelligence (+1 suc auto)", sagaBonus: 1 },
        requirements: { intelligence: 2 },
        incompatible: ["Godi", "Berserk", "Sous le regard de Thor", "Sous le regard de Tyr", "Sous le regard de Freyr", "Sous le regard de Freyja", "Sous le regard de Loki"]
    },
    {
        name: "Sous le regard de Thor",
        description: "Le Tonnerre semble te protéger. Tu as survécu à des orages mortels. Tes coups frappent avec une force surprenante.",
        effects: { description: "Force (+1 suc auto)", sagaBonus: 1 },
        requirements: { force: 3 },
        incompatible: ["Godi", "Sous le regard d'Odin", "Sous le regard de Tyr", "Sous le regard de Freyr", "Sous le regard de Freyja", "Sous le regard de Loki"]
    },
    {
        name: "Sous le regard de Tyr",
        description: "Tu es un parangon d'honneur et de courage. Ton bras ne tremble jamais, même face à la mort certaine. Tyr le Manchot semble guider ta lame.",
        effects: { description: "Agilité (+1 suc auto)", sagaBonus: 1 },
        requirements: { agilite: 2 },
        incompatible: ["Godi", "Langue de serpent", "Berserk", "Sous le regard d'Odin", "Sous le regard de Thor", "Sous le regard de Freyr", "Sous le regard de Freyja", "Sous le regard de Loki"]
    },
    {
        name: "Sous le regard de Freyr",
        description: "La fertilité et la prospérité te suivent. Tes champs donnent mieux, les animaux t'aiment, les affaires prospèrent. Le Seigneur des Récoltes te bénit.",
        effects: { description: "Charisme (+1 suc auto)", sagaBonus: 1 },
        requirements: { charisme: 2 },
        incompatible: ["Godi", "Sanglant", "Sous le regard d'Odin", "Sous le regard de Thor", "Sous le regard de Tyr", "Sous le regard de Freyja", "Sous le regard de Loki"]
    },
    {
        name: "Sous le regard de Freyja",
        description: "La Maîtresse de la Magie et de la Beauté t'a remarqué. Tu es charismatique, ton intuition troublante, tes perceptions dépassent le commun.",
        effects: { description: "Perception (+1 suc auto)", sagaBonus: 1 },
        requirements: { perception: 2 },
        incompatible: ["Godi", "Sous le regard d'Odin", "Sous le regard de Thor", "Sous le regard de Tyr", "Sous le regard de Freyr", "Sous le regard de Loki"]
    },
    {
        name: "Sous le regard de Loki",
        description: "Le Dieu du Chaos et de la Ruse trouve ton existence amusante. Les coïncidences impossibles se multiplient : corde qui cède, ennemi qui trébuche. Chance pure ou manipulation divine ?",
        effects: { description: "Chance (+1 suc auto)", sagaBonus: 1 },
        requirements: { chance: 2 },
        incompatible: ["Godi", "Sous le regard d'Odin", "Sous le regard de Thor", "Sous le regard de Tyr", "Sous le regard de Freyr", "Sous le regard de Freyja"]
    },
    {
        name: "Lien avec les Landvættir",
        description: "Tu respectes profondément les esprits de la terre. Tu laisses toujours des offrandes, ne souilles jamais les sources sacrées. En retour, ils te guident.",
        effects: { description: "Survie (+1 suc auto) en nature, Dressage (+1 suc auto)" },
        requiresSkill: { "Survie": 2 },
        incompatible: ["Sanglant"]
    },
    {
        name: "Jumeau/Jumelle",
        description: "Tu es né avec un frère ou sœur jumelle. Ce lien est mystique. Vous partagez une connexion troublante, une intuition qui permet de sentir l'état de l'autre.",
        effects: { description: "Perception (+1 suc auto). Si jumeau mort: Chance (+1 suc auto) supplémentaire" },
        requirements: {},
        incompatible: []
    },
    {
        name: "Enfant des nuits blanches",
        description: "Né lors du solstice d'été, sous le soleil de minuit. Béni par la lumière éternelle. Tu te sens vivant sous le jour sans fin, mais l'obscurité t'oppresse.",
        effects: { description: "Perception (+1 suc auto) en plein jour, Charisme (+1 suc auto). Perception (-1 suc auto) dans obscurité" },
        requirements: {},
        incompatible: ["Enfant de l'hiver noir", "Vue perçante"]
    },
    {
        name: "Enfant de l'hiver noir",
        description: "Né lors du solstice d'hiver, dans la nuit polaire. Tu portes l'ombre en toi. Tu vois dans le noir mais le soleil éclatant te brûle les yeux.",
        effects: { description: "Perception (+1 suc auto) dans obscurité, Intimidation (+1 suc auto). Perception (-1 suc auto) en pleine lumière" },
        requirements: {},
        incompatible: ["Enfant des nuits blanches", "Vue perçante"]
    },
    {
        name: "Orphelin aguerri",
        description: "Grandi seul, sans famille. Tu as appris à survivre : voler, mentir, te cacher. Mais cette enfance a laissé des cicatrices. Tu ne sais pas faire confiance.",
        effects: { description: "Survie (+1 suc auto), Larcin (+1 suc auto), Charisme (-1 suc auto)" },
        requirements: { agilite: 2 },
        incompatible: ["Noble lignée", "Dernier de la lignée", "Bâtard reconnu", "Ancien esclave"]
    },
    {
        name: "Dernier de la lignée",
        description: "Dernier descendant d'une famille autrefois puissante. Le poids de perpétuer le nom repose sur tes épaules. Chaque échec est une trahison envers tes ancêtres.",
        effects: { description: "Chance (-1 suc auto). Obligation narrative: pressions familiales/ennemis anciens", sagaBonus: 1 },
        requirements: { charisme: 2 },
        incompatible: ["Orphelin aguerri", "Ancien esclave", "Bâtard reconnu", "Noble lignée"]
    },
    {
        name: "Bâtard reconnu",
        description: "Enfant illégitime d'un noble. Ton père t'a reconnu publiquement, te donnant son nom mais pas son héritage. Les héritiers légitimes te méprisent.",
        effects: { sagaBonus: 1 },
        requirements: {},
        incompatible: ["Noble lignée", "Ancien esclave", "Orphelin aguerri", "Dernier de la lignée"]
    },
    {
        name: "Serment rompu",
        description: "Tu as trahi un serment sacré. Par nécessité, lâcheté, ou force. Ton honneur est souillé, ton nom sali. Les gens te méprisent. Les dieux t'ont tourné le dos.",
        effects: { description: "Charisme (-2 suc auto), Intimidation (+1 suc auto), Chance (-1 suc auto)" },
        requirements: {},
        incompatible: ["Noble lignée", "Sous le regard de Tyr", "Grand guérisseur"]
    },
    {
        name: "Dette de sang",
        description: "Ta famille doit une compensation massive (wergild) pour un meurtre. Cette dette est colossale, impayable en une vie. Les créanciers peuvent apparaître n'importe quand.",
        effects: { description: "Charisme (-1 suc auto), Survie (+1 suc auto). Motivation narrative: remboursement" },
        requirements: {},
        incompatible: ["Noble lignée"]
    }
];

// ============================================
// RUNES (24 runes du Futhark)
// ============================================

export const RUNES = [
    { symbol: "ᚠ", name: "Fehu", letter: "F", literal: "Bétail", esoteric: "Argent, richesse" },
    { symbol: "ᚢ", name: "Uruz", letter: "U", literal: "Aurochs", esoteric: "Force, virilité" },
    { symbol: "ᚦ", name: "Thurisaz", letter: "Th", literal: "Thor, Géant", esoteric: "Monstre, démon, chaos" },
    { symbol: "ᚨ", name: "Ansuz", letter: "A", literal: "Messager, ange", esoteric: "Communication, source, Odin" },
    { symbol: "ᚱ", name: "Raidho", letter: "R", literal: "Monter à cheval, Charriot", esoteric: "Voyage, moyen de transport, roue" },
    { symbol: "ᚲ", name: "Kauno", letter: "K", literal: "Torche", esoteric: "Transition, soin, lumière" },
    { symbol: "ᚷ", name: "Gebo", letter: "G", literal: "Cadeau", esoteric: "Cadeau, surprise, baiser, chance, aubaine, fortune" },
    { symbol: "ᚹ", name: "Wunjo", letter: "W", literal: "Joie", esoteric: "Joie, bonheur, romance" },
    { symbol: "ᚺ", name: "Hagalaz", letter: "H", literal: "Grêle", esoteric: "Adversité, Perturbation" },
    { symbol: "ᚾ", name: "Naudiz", letter: "N", literal: "Besoin", esoteric: "Nécessité, contrainte, friction" },
    { symbol: "ᛁ", name: "Isa", letter: "I (short)", literal: "Glace", esoteric: "Stagnation, froid, stase, immobile" },
    { symbol: "ᛃ", name: "Jera", letter: "J", literal: "Année, Moisson", esoteric: "Moisson, cycle, Abondance" },
    { symbol: "ᛇ", name: "Ihwaz", letter: "Y, I (long)", literal: "(Bois d')if", esoteric: "Yggdrasil, longévité, arbre" },
    { symbol: "ᛈ", name: "Perth", letter: "P", literal: "Foyer", esoteric: "Destin, fatalité, Nornes, divination" },
    { symbol: "ᛉ", name: "Algiz", letter: "Z (Rr)", literal: "Cerf", esoteric: "Abri, protection" },
    { symbol: "ᛊ", name: "Sowilo", letter: "S", literal: "Soleil", esoteric: "Succès, énergie" },
    { symbol: "ᛏ", name: "Tiwaz", letter: "T", literal: "Le Dieu Tyr", esoteric: "Courage, se faire justice, guerre, sacrifice" },
    { symbol: "ᛒ", name: "Berkanan", letter: "B", literal: "Bouleau", esoteric: "Fertilité, croissance" },
    { symbol: "ᛖ", name: "Ehwaz", letter: "E", literal: "Cheval", esoteric: "Vitesse, progression, confiance" },
    { symbol: "ᛗ", name: "Mannaz", letter: "M", literal: "Homme", esoteric: "Humanité, conscience" },
    { symbol: "ᛚ", name: "Laguz", letter: "L", literal: "Eau", esoteric: "Inconscient, collectif, mémoire, flux" },
    { symbol: "ᛜ", name: "Ingwaz", letter: "Ng", literal: "Graine", esoteric: "Harmony, unité, paix" },
    { symbol: "ᛟ", name: "Othila", letter: "O", literal: "Ancêtre", esoteric: "Héritage, possession terrestre, noble" },
    { symbol: "ᛞ", name: "Dagaz", letter: "D, Dj", literal: "Jour", esoteric: "Eveil, aube, percée, progrès, pureté" }
];

// ============================================
// NOMS DE CARACTÉRISTIQUES
// ============================================

export const CARACNAMES = {
    force: "Force",
    agilite: "Agilité",
    perception: "Perception",
    intelligence: "Intelligence",
    charisme: "Charisme",
    chance: "Chance"
};

// ============================================
// OBJETS / ÉQUIPEMENT
// ============================================

export const ITEMS = [
    // ARMES 1 MAIN
    {
        name: "Hache",
        category: "weapon",
        weaponType: "1 main",
        damage: 2,
        requirements: { force: 2 }
    },
    {
        name: "Gourdin",
        category: "weapon",
        weaponType: "1 main",
        damage: 1,
        requirements: { force: 1 }
    },
    {
        name: "Épée",
        category: "weapon",
        weaponType: "1 main",
        damage: 2,
        requirements: { force: 2 }
    },
    {
        name: "Couteau",
        category: "weapon",
        weaponType: "1 main / Jet",
        damage: 1,
        range: "15m",
        requirements: { force: 1, agilite: 1 }
    },
    
    // ARMES 2 MAINS
    {
        name: "Hache Dane",
        category: "weapon",
        weaponType: "2 mains",
        damage: 2,
        requirements: { force: 2, agilite: 2 }
    },
    {
        name: "Glaive",
        category: "weapon",
        weaponType: "2 mains",
        damage: 2,
        requirements: { force: 2 }
    },
    {
        name: "Scramasaxe",
        category: "weapon",
        weaponType: "2 mains",
        damage: 1,
        requirements: { force: 1 }
    },
    {
        name: "Épée longue",
        category: "weapon",
        weaponType: "2 mains",
        damage: 2,
        requirements: { force: 3 }
    },
    {
        name: "Grande hache",
        category: "weapon",
        weaponType: "2 mains",
        damage: 2,
        requirements: { force: 3 }
    },
    {
        name: "Bâton",
        category: "weapon",
        weaponType: "2 mains",
        damage: 2,
        requirements: { force: 2 }
    },
    {
        name: "Lance",
        category: "weapon",
        weaponType: "2 mains / Jet",
        damage: 2,
        range: "15m",
        requirements: { force: 2, agilite: 2 }
    },
    
    // ARMES DISTANCE
    {
        name: "Arc",
        category: "weapon",
        weaponType: "Distance",
        damage: 1,
        range: "30m",
        requirements: { agilite: 2 }
    },
    {
        name: "Javelot",
        category: "weapon",
        weaponType: "Distance",
        damage: 2,
        range: "25m",
        requirements: { force: 3 }
    },
    {
        name: "Fronde",
        category: "weapon",
        weaponType: "Distance",
        damage: 1,
        range: "20m",
        requirements: { agilite: 1 }
    },
    
    // ARMURES
    {
        name: "Tissu",
        category: "armor",
        armorValue: 0,
        requirements: {}
    },
    {
        name: "Tissu décoré",
        category: "armor",
        armorValue: 0,
        requirements: {}
    },
    {
        name: "Broigne",
        category: "armor",
        armorValue: 1,
        requirements: { force: 1 }
    },
    {
        name: "Peau de bête",
        category: "armor",
        armorValue: 1,
        requirements: { force: 1 }
    },
    {
        name: "Plaque de cuir",
        category: "armor",
        armorValue: 2,
        requirements: { force: 2 }
    },
    {
        name: "Cuir renforcé",
        category: "armor",
        armorValue: 2,
        requirements: { force: 2 }
    },
    {
        name: "Casque",
        category: "armor",
        armorValue: 1,
        requirements: {}
    },
    
    // BOUCLIERS
    {
        name: "Bouclier en bois",
        category: "armor",
        armorValue: 1,
        requirements: {}
    },
    {
        name: "Bouclier cuir",
        category: "armor",
        armorValue: 2,
        requirements: {}
    },
    
    // OBJETS DIVERS
    {
        name: "Corde (10m)",
        category: "item"
    },
    {
        name: "Chaîne (au mètre)",
        category: "item"
    },
    {
        name: "Provisions (semaine)",
        category: "item"
    },
    {
        name: "Pichet de vin",
        category: "item"
    },
    {
        name: "Fruits (au kg)",
        category: "item"
    },
    {
        name: "Nécessaire de toilette",
        category: "item"
    },
    {
        name: "Fourrure",
        category: "item"
    },
    {
        name: "Médaillon protection",
        category: "item"
    },
    {
        name: "Corne à boire",
        category: "item"
    },
    {
        name: "Rame",
        category: "item"
    },
    {
        name: "Once d'argent",
        category: "item"
    }
];

// Templates NPCs
export const NPC_TEMPLATES = [
    {
        name: 'Bandit',
        blessure: 0,
        blessureMax: 5,
        armure: 1,
        seuil: 1,
        actionsMax: 1,
        attaques: [
            { name: 'Hache', succes: 6, explosion: 10, degats: 2 }
        ]
    },
    {
        name: 'Guerrier',
        blessure: 0,
        blessureMax: 5,
        armure: 3,
        seuil: 1,
        actionsMax: 2,
        attaques: [
            { name: 'Épée', succes: 5, explosion: 9, degats: 2 },
            { name: 'Bouclier (coup)', succes: 6, explosion: 10, degats: 1 }
        ]
    },
    {
        name: 'Loup',
        blessure: 0,
        blessureMax: 4,
        armure: 0,
        seuil: 2,
        actionsMax: 2,
        attaques: [
            { name: 'Morsure', succes: 5, explosion: 9, degats: 2 }
        ]
    }
];