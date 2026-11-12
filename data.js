const L = (en, hi, ta) => ({ en, hi, ta });

/* Shared descriptions for dynamically detected tactics and the weak-spot profile. */
const TAG_INFO = {
  urgency: {
    label: L('Fake urgency', 'नकली जल्दबाजी', 'போலி அவசரம்'),
    category: L('Psychological lever', 'मनोवैज्ञानिक दबाव', 'உளவியல் தூண்டல்'),
    desc: L('Urgency steals the few seconds you need to check the claim.', 'जल्दबाजी जाँच के लिए ज़रूरी कुछ सेकंड छीन लेती है।', 'அவசரம் சரிபார்க்க தேவையான சில வினாடிகளைப் பறிக்கிறது.'),
    counter: L('Pause for 30 seconds. Real emergencies do not arrive as chain messages.', '30 सेकंड रुकें। असली आपात स्थिति चेन मेसेज से नहीं आती।', '30 வினாடிகள் நிறுத்துங்கள். உண்மையான அவசரம் சங்கிலி செய்தியாக வராது.')
  },
  authority: {
    label: L('False authority', 'झूठी सत्ता', 'போலி அதிகாரம்'),
    category: L('Cognitive hook', 'मानसिक जाल', 'அறிவு தூண்டல்'),
    desc: L('A vague official-sounding source makes the claim feel verified when it is not.', 'धुँधला सरकारी जैसा स्रोत दावे को सत्यापित जैसा महसूस कराता है, जबकि वह नहीं है।', 'தெளிவற்ற அரசு போன்ற ஆதாரம் கூற்றை சரிபார்க்கப்பட்டதாக உணர வைக்கும்; உண்மையில் அல்ல.'),
    counter: L('Ask which office, which document, and which date. Real notices have all three.', 'पूछें: कौन-सा विभाग, कौन-सा दस्तावेज़, कौन-सी तारीख। असली सूचना में तीनों होते हैं।', 'எந்த அலுவலகம், எந்த ஆவணம், எந்த தேதி என்று கேளுங்கள். உண்மையான அறிவிப்பில் மூன்றும் இருக்கும்.')
  },
  link: {
    label: L('Disguised link', 'छिपा लिंक', 'மறைந்த இணைப்பு'),
    category: L('Technical trap', 'तकनीकी जाल', 'தொழில்நுட்ப பொறி'),
    desc: L('Shortened links hide the real domain and can lead to credential theft.', 'छोटे लिंक असली डोमेन छिपाकर पासवर्ड चोरी कर सकते हैं।', 'சுருக்கிய இணைப்புகள் உண்மையான டொமைனை மறைத்து கடவுச்சொல்லைத் திருடலாம்.'),
    counter: L('Open the official app or type the official website yourself. Never through the link.', 'आधिकारिक ऐप खोलें या वेबसाइट खुद टाइप करें। लिंक से नहीं।', 'அதிகாரப்பூர்வ ஆப்பைத் திறங்கள் அல்லது இணையதளத்தை நேரடியாக தட்டச்சு செய்யுங்கள். இணைப்பு வழியாக அல்ல.')
  },
  fear: {
    label: L('Fear pressure', 'डर का दबाव', 'பய அழுத்தம்'),
    category: L('Emotional bait', 'भावनात्मक चारा', 'உணர்ச்சி தூண்டில்'),
    desc: L('Threats of loss make people act before they verify.', 'नुकसान का डर लोगों से जाँच से पहले कार्रवाई करवाता है।', 'இழப்பு பயம் மக்களை சரிபார்ப்புக்கு முன் செயல்பட வைக்கும்.'),
    counter: L('Check your account through the bank app, not through the message.', 'बैंक ऐप से खाता देखें, संदेश से नहीं।', 'வங்கி ஆப் மூலம் கணக்கைப் பாருங்கள்; செய்தி மூலம் அல்ல.')
  },
  health: {
    label: L('Miracle cure', 'चमत्कारी इलाज', 'அதிசய மருந்து'),
    category: L('Health hoax', 'स्वास्थ्य भ्रांति', 'சுகாதார மோசடி'),
    desc: L('Unverified cures can delay real treatment and cause harm.', 'बिना जाँचे इलाज असली इलाज में देरी कर नुकसान पहुँचा सकता है।', 'சரிபார்க்கப்படாத மருந்து உண்மையான சிகிச்சையை தாமதப்படுத்தி தீங்கு விளைவிக்கலாம்.'),
    counter: L('Consult a registered doctor or the health ministry before believing a cure.', 'किसी भी इलाज पर भरोसा करने से पहले पंजीकृत डॉक्टर या स्वास्थ्य मंत्रालय से सलाह लें।', 'எந்த மருந்தையும் நம்பும் முன் பதிவு செய்யப்பட்ட மருத்துவர் அல்லது சுகாதார அமைச்சகத்தை அணுகுங்கள்.')
  },
  emotional: {
    label: L('Emotional bait', 'भावनात्मक चारा', 'உணர்ச்சி தூண்டில்'),
    category: L('Social coercion', 'सामाजिक दबाव', 'சமூக அழுத்தம்'),
    desc: L('Guilt, fear or superstition is used to make forwarding feel like a duty.', 'अपराध, डर या अंधविश्वास फॉरवर्ड करने को कर्तव्य जैसा बनाता है।', 'குற்ற உணர்வு, பயம் அல்லது மூடநம்பிக்கை பகிர்வதை கடமையாக உணர வைக்கும்.'),
    counter: L('You are allowed to delete a message. Fear is not evidence.', 'आप संदेश हटा सकते हैं। डर सबूत नहीं है।', 'செய்தியை நீக்க உங்களுக்கு உரிமை உண்டு. பயம் ஆதாரம் அல்ல.')
  },
  social: {
    label: L('Chain-forward pressure', 'चेन फॉरवर्ड दबाव', 'சங்கிலி அனுப்பும் அழுத்தம்'),
    category: L('Viral coercion', 'वायरल दबाव', 'வைரல் அழுத்தம்'),
    desc: L('“Forward to 10 people” turns you into a distributor of the hoax.', '“10 लोगों को भेजें” आपको अफवाह फैलाने वाला बना देता है।', '“10 பேருக்கு அனுப்புங்கள்” என்பது உங்களை வதந்தி பரப்புநராக மாற்றும்.'),
    counter: L('Break the chain. Forwarding is not a duty.', 'चेन तोड़ें। फॉरवर्ड करना कर्तव्य नहीं है।', 'சங்கிலியை உடையுங்கள். பகிர்வது கடமை அல்ல.')
  },
  imagery: {
    label: L('Recycled image', 'पुरानी तस्वीर', 'மீண்டும் பயன்படுத்திய படம்'),
    category: L('Visual deception', 'दृश्य धोखा', 'காட்சி ஏமாற்றம்'),
    desc: L('Old or unrelated images are presented as breaking evidence.', 'पुरानी या असंबंधित तस्वीरें ताज़ा सबूत बताई जाती हैं।', 'பழைய அல்லது தொடர்பில்லாத படங்கள் புதிய ஆதாரமாகக் காட்டப்படுகின்றன.'),
    counter: L('Reverse-image search it and look for the original date and location.', 'रिवर्स इमेज सर्च करें और असली तारीख व जगह देखें।', 'படத்தை திருப்பி தேடி அசல் தேதி, இடத்தைப் பாருங்கள்.')
  },
  verification: {
    label: L('Unverified source', 'असत्यापित स्रोत', 'சரிபார்க்காத ஆதாரம்'),
    category: L('Evidence gap', 'सबूत की कमी', 'ஆதார இடைவெளி'),
    desc: L('The claim has no named source, link, date or document to check.', 'दावे में जाँचने के लिए स्रोत, लिंक, तारीख या दस्तावेज़ नहीं है।', 'கூற்றில் சரிபார்க்க ஆதாரம், இணைப்பு, தேதி அல்லது ஆவணம் இல்லை.'),
    counter: L('Search for the original announcement before believing or sharing.', 'मानने या साझा करने से पहले मूल घोषणा खोजें।', 'நம்புவதற்கு அல்லது பகிர்வதற்கு முன் அசல் அறிவிப்பைத் தேடுங்கள்.')
  }
};

const CLAIMS = {
  health: {
    key: 'health',
    threadId: 'NP-9041',
    text: 'Govt secretly releasing emergency herbal remedy for new virus, forward to all contacts immediately!',
    verdict: 'false',
    subtype: L('Health hoax', 'स्वास्थ्य भ्रांति', 'சுகாதார மோசடி'),
    confidence: 97,
    risk: 92,
    checks: 64,
    location: L('Chennai & Delhi', 'चेन्नई और दिल्ली', 'சென்னை & டெல்லி'),
    isSpike: true,
    title: L('Secret government herbal cure for a new virus', 'नए वायरस के लिए सरकारी हर्बल इलाज?', 'புதிய வைரஸுக்கு அரசின் ரகசிய மூலிகை மருந்து?'),
    summary: L('No government advisory exists. The “secret cure” is a chain message designed to spread panic and false hope.', 'ऐसी कोई सरकारी सलाह मौजूद नहीं है। यह “गुप्त इलाज” डर और झूठी उम्मीद फैलाने वाला चेन मेसेज है।', 'இத்தகைய அரசு அறிவிப்பு எதுவும் இல்லை. இந்த “ரகசிய மருந்து” பயத்தையும் பொய்யான நம்பிக்கையையும் பரப்பும் சங்கிலி செய்தி.'),
    primaryTag: 'urgency',
    tactics: [
      { key: 'secret', phrase: 'secretly releasing', label: L('Secret authority', 'गुप्त सत्ता', 'ரகசிய அதிகாரம்'), category: L('Conspiracy cue', 'षड्यंत्र संकेत', 'சதித் துப்பு'), desc: L('“The government is secretly releasing…” sounds exclusive, but gives no ministry, order number or date to verify.', '“सरकार गुप्त रूप से…” खास जानकारी जैसा लगता है, पर मंत्रालय, आदेश या तारीख नहीं देता।', '“அரசு ரகசியமாக…” என்பது உள்ளிருப்பு தகவல் போன்று தோன்றும்; ஆனால் அமைச்சகம், ஆணை அல்லது தேதி இல்லை.'), counter: L('Ask: which ministry, which order number, which date?', 'पूछें: कौन-सा मंत्रालय, कौन-सा आदेश, कौन-सी तारीख?', 'கேளுங்கள்: எந்த அமைச்சகம், எந்த ஆணை, எந்த தேதி?'), positive: false },
      { key: 'cure', phrase: 'emergency herbal remedy', label: L('Miracle cure', 'चमत्कारी इलाज', 'அதிசய குணம்'), category: L('Health hoax', 'स्वास्थ्य भ्रांति', 'சுகாதார மோசடி'), desc: L('An unapproved remedy can delay real treatment and cause harm.', 'बिना अनुमोदित इलाज असली इलाज में देरी करा सकता है और नुकसान पहुँचा सकता है।', 'அனுமதிக்கப்படாத மருந்து உண்மையான சிகிச்சையை தாமதப்படுத்தி தீங்கு விளைவிக்கலாம்.'), counter: L('Check the health ministry or a registered doctor before believing a cure.', 'किसी इलाज पर भरोसा करने से पहले स्वास्थ्य मंत्रालय या पंजीकृत डॉक्टर से जाँचें।', 'எந்த மருந்தையும் நம்பும் முன் சுகாதார அமைச்சகம் அல்லது பதிவு செய்யப்பட்ட மருத்துவரிடம் சரிபார்க்கவும்.'), positive: false },
      { key: 'forward', phrase: 'forward to all contacts', label: L('Chain-forward pressure', 'चेन फॉरवर्ड दबाव', 'சங்கிலி அனுப்பும் அழுத்தம்'), category: L('Viral coercion', 'वायरल दबाव', 'வைரல் அழுத்தம்'), desc: L('The instruction turns you into a distributor and makes forwarding feel like a duty.', 'यह निर्देश आपको संदेश फैलाने वाला बना देता है और फॉरवर्ड को कर्तव्य जैसा बनाता है।', 'இந்த அறிவுரை உங்களை செய்தி பரப்புநராக மாற்றி பகிர்வை கடமையாக உணர வைக்கும்.'), counter: L('You are not responsible for forwarding. Break the chain.', 'फॉरवर्ड करना आपकी जिम्मेदारी नहीं है। चेन तोड़ें।', 'பகிர்வது உங்கள் கடமை அல்ல. சங்கிலியை உடையுங்கள்.'), positive: false },
      { key: 'urgent', phrase: 'immediately!', label: L('Fake urgency', 'नकली जल्दबाजी', 'போலி அவசரம்'), category: L('Psychological lever', 'मनोवैज्ञानिक दबाव', 'உளவியல் தூண்டல்'), desc: L('Urgency short-circuits careful thinking and pushes you to forward before checking.', 'जल्दबाजी सोचने का समय छीनकर जाँच से पहले फॉरवर्ड करवाती है।', 'அவசரம் சிந்திக்கும் நேரத்தை பறித்து சரிபார்ப்புக்கு முன் பகிர வைக்கும்.'), counter: L('Pause for 30 seconds. Real emergencies do not arrive as chain messages.', '30 सेकंड रुकें। असली आपात स्थिति चेन मेसेज से नहीं आती।', '30 வினாடிகள் நிறுத்துங்கள். உண்மையான அவசரம் சங்கிலி செய்தியாக வராது.'), positive: false }
    ],
    facts: {
      en: ['No Ministry of Health advisory or order exists.', 'Unapproved herbal cures can delay real treatment.', 'Official advice: consult a registered doctor or PHC.'],
      hi: ['स्वास्थ्य मंत्रालय की ऐसी कोई सलाह या आदेश नहीं है।', 'बिना अनुमोदित हर्बल इलाज असली इलाज में देरी कर सकता है।', 'आधिकारिक सलाह: पंजीकृत डॉक्टर या प्राथमिक स्वास्थ्य केंद्र से सलाह लें।'],
      ta: ['சுகாதார அமைச்சகத்தின் அத்தகைய அறிவிப்போ ஆணையோ இல்லை.', 'அனுமதிக்கப்படாத மூலிகை மருந்து உண்மையான சிகிச்சையை தாமதப்படுத்தலாம்.', 'அதிகாரப்பூர்வ ஆலோசனை: பதிவு செய்யப்பட்ட மருத்துவர் அல்லது ஆரம்ப சுகாதார நிலையத்தை அணுகவும்.']
    },
    replies: {
      elder: L('Vanakkam Uncle/Auntie, thank you for thinking of our health. I checked this with the Ministry of Health — there is no such emergency remedy. Please don’t forward it; it could make someone skip proper treatment. 🙏', 'नमस्ते अंकल/आंटी, हमारी सेहत का ख्याल रखने के लिए धन्यवाद। मैंने स्वास्थ्य मंत्रालय से जाँच की — ऐसा कोई आपातकालीन इलाज नहीं है। कृपया इसे आगे न भेजें; इससे कोई असली इलाज छोड़ सकता है। 🙏', 'வணக்கம் அங்கிள்/ஆன்ட்டி, எங்கள் உடல்நலத்தை நினைத்ததற்கு நன்றி. சுகாதார அமைச்சகத்தில் சரிபார்த்தேன் — அப்படி ஒரு அவசர மருந்து இல்லை. தயவுசெய்து இதை அனுப்ப வேண்டாம்; இது உண்மையான சிகிச்சையை தவிர்க்க வைக்கலாம். 🙏'),
      peer: L('Heads-up — this “secret herbal cure” is a chain hoax. PIB and the Health Ministry have no such advisory. Don’t forward it; I can send the fact-card if useful.', 'हेड्स-अप — यह “गुप्त हर्बल इलाज” चेन अफवाह है। PIB और स्वास्थ्य मंत्रालय की ऐसी कोई सलाह नहीं है। इसे फॉरवर्ड न करें; चाहें तो फैक्ट-कार्ड भेज सकता/सकती हूँ।', 'கவனத்திற்கு — இந்த “ரகசிய மூலிகை மருந்து” ஒரு சங்கிலி வதந்தி. PIB மற்றும் சுகாதார அமைச்சகத்திடம் இத்தகைய அறிவிப்பு இல்லை. அனுப்ப வேண்டாம்; தேவைப்பட்டால் ஃபேக்ட் கார்டை அனுப்புகிறேன்.'),
      firm: L('Please stop forwarding unverified health cures. This claim has no official source and can cause real harm. Check PIB Fact Check before sending health advice to the group.', 'कृपया बिना जाँचे स्वास्थ्य इलाज फॉरवर्ड करना बंद करें। इस दावे का कोई आधिकारिक स्रोत नहीं है और इससे असली नुकसान हो सकता है। ग्रुप में स्वास्थ्य सलाह भेजने से पहले PIB Fact Check देखें।', 'சரிபார்க்கப்படாத சுகாதார மருந்துகளை அனுப்புவதை நிறுத்துங்கள். இந்தக் கூற்றுக்கு அதிகாரப்பூர்வ ஆதாரம் இல்லை; இது உண்மையான தீங்கை ஏற்படுத்தலாம். குழுவுக்கு சுகாதார ஆலோசனை அனுப்பும் முன் PIB Fact Check பாருங்கள்.')
    },
    card: {
      stamp: L('FAKE', 'फ़र्ज़ी', 'போலி'),
      headline: L('“Secret herbal cure” for a new virus', 'नए वायरस का “गुप्त हर्बल इलाज”', 'புதிய வைரஸுக்கு “ரகசிய மூலிகை மருந்து”'),
      footer: L('PIB Fact Check · Ministry of Health', 'PIB फैक्ट चेक · स्वास्थ्य मंत्रालय', 'PIB ஃபேக்ட் செக் · சுகாதார அமைச்சகம்')
    },
    citations: ['PIB Fact Check', 'Ministry of Health', 'AltNews']
  },

  phishing: {
    key: 'phishing',
    threadId: 'NP-8820',
    text: 'Your bank account blocked. Click bit.ly/fake-link to update KYC instantly.',
    verdict: 'false',
    subtype: L('Financial phishing', 'वित्तीय फिशिंग', 'நிதி மோசடி'),
    confidence: 99,
    risk: 96,
    checks: 112,
    location: L('SMS gateway · national', 'SMS गेटवे · राष्ट्रीय', 'SMS கேட்வே · தேசிய அளவில்'),
    isSpike: true,
    title: L('Fake bank block and KYC warning', 'नकली बैंक ब्लॉक और KYC चेतावनी', 'போலி வங்கி முடக்கம் மற்றும் KYC எச்சரிக்கை'),
    summary: L('Banks do not send shortened links or demand instant KYC by SMS. This is a credential-phishing attempt.', 'बैंक छोटे लिंक नहीं भेजते और SMS से तुरंत KYC नहीं माँगते। यह पासवर्ड चुराने की कोशिश है।', 'வங்கிகள் சுருக்கிய இணைப்புகளை அனுப்புவதில்லை; SMS மூலம் உடனடி KYC கேட்பதில்லை. இது கடவுச்சொல் திருடும் முயற்சி.'),
    primaryTag: 'link',
    tactics: [
      { key: 'blocked', phrase: 'blocked', label: L('Threat of loss', 'नुकसान का डर', 'இழப்பு பயம்'), category: L('Fear induction', 'डर पैदा करना', 'பயம் தூண்டுதல்'), desc: L('The message triggers panic by claiming your money or account is inaccessible.', 'संदेश कहता है कि आपका पैसा या खाता बंद है, जिससे घबराहट होती है।', 'உங்கள் பணம் அல்லது கணக்கு முடக்கப்பட்டதாகக் கூறி பதற்றத்தை உருவாக்குகிறது.'), counter: L('Open your bank app directly. Never act through the message.', 'सीधे बैंक ऐप खोलें। संदेश से कुछ न करें।', 'வங்கி ஆப்பை நேரடியாகத் திறங்கள். செய்தி வழியாக எதுவும் செய்ய வேண்டாம்.'), positive: false },
      { key: 'shortlink', phrase: 'bit.ly/fake-link', label: L('Disguised link', 'छिपा लिंक', 'மறைந்த இணைப்பு'), category: L('Technical trap', 'तकनीकी जाल', 'தொழில்நுட்ப பொறி'), desc: L('Short links hide the real website. This one is not a bank domain.', 'छोटे लिंक असली वेबसाइट छिपाते हैं। यह बैंक का डोमेन नहीं है।', 'சுருக்கிய இணைப்புகள் உண்மையான இணையதளத்தை மறைக்கின்றன. இது வங்கி டொமைன் அல்ல.'), counter: L('Type your bank’s official address or use its app.', 'अपने बैंक का आधिकारिक पता टाइप करें या ऐप इस्तेमाल करें।', 'உங்கள் வங்கியின் அதிகாரப்பூர்வ முகவரியைத் தட்டச்சு செய்யுங்கள் அல்லது ஆப்பைப் பயன்படுத்துங்கள்.'), positive: false },
      { key: 'kyc', phrase: 'KYC', label: L('Compliance pretext', 'KYC का बहाना', 'KYC சாக்கு'), category: L('Social engineering', 'सामाजिक इंजीनियरिंग', 'சமூக ஏமாற்றம்'), desc: L('Scammers borrow official banking words to ask for OTP, PIN or documents.', 'ठग आधिकारिक बैंकिंग शब्दों का इस्तेमाल OTP, PIN या दस्तावेज़ माँगने के लिए करते हैं।', 'மோசடியாளர்கள் OTP, PIN அல்லது ஆவணங்களைக் கேட்க அதிகாரப்பூர்வ வங்கி வார்த்தைகளைப் பயன்படுத்துகிறார்கள்.'), counter: L('Banks never ask for OTP or PIN over SMS.', 'बैंक SMS पर OTP या PIN नहीं माँगते।', 'வங்கிகள் SMS மூலம் OTP அல்லது PIN கேட்பதில்லை.'), positive: false },
      { key: 'instant', phrase: 'instantly', label: L('Instant action pressure', 'तुरंत कार्रवाई का दबाव', 'உடனடி நடவடிக்கை அழுத்தம்'), category: L('Psychological lever', 'मनोवैज्ञानिक दबाव', 'உளவியல் தூண்டல்'), desc: L('The countdown stops you from checking through official channels.', 'तुरंत करने का दबाव आधिकारिक तरीके से जाँचने का मौका नहीं देता।', 'உடனடி என்ற அழுத்தம் அதிகாரப்பூர்வ வழியில் சரிபார்க்க விடாது.'), counter: L('No genuine bank closes an account within minutes.', 'कोई असली बैंक मिनटों में खाता बंद नहीं करता।', 'உண்மையான வங்கி நிமிடங்களில் கணக்கை முடக்காது.'), positive: false }
    ],
    facts: {
      en: ['Banks never use bit.ly links for KYC.', 'Never share OTP, PIN, CVV or passwords.', 'Report to 1930 or cybercrime.gov.in.'],
      hi: ['बैंक KYC के लिए bit.ly लिंक नहीं भेजते।', 'OTP, PIN, CVV या पासवर्ड कभी साझा न करें।', '1930 या cybercrime.gov.in पर रिपोर्ट करें।'],
      ta: ['வங்கிகள் KYC க்கு bit.ly இணைப்புகளைப் பயன்படுத்துவதில்லை.', 'OTP, PIN, CVV அல்லது கடவுச்சொல்லை யாருக்கும் சொல்ல வேண்டாம்.', '1930 அல்லது cybercrime.gov.in இல் புகார் செய்யுங்கள்.']
    },
    replies: {
      elder: L('Appa/Amma, please do not click that link! Banks never send bit.ly links or threaten to block an account by SMS. It is a fraud attempt to steal passwords. I can help you check your account through the official app.', 'अंकल/आंटी, कृपया उस लिंक पर क्लिक न करें! बैंक bit.ly लिंक नहीं भेजते और SMS से खाता बंद करने की धमकी नहीं देते। यह पासवर्ड चुराने की ठगी है। मैं आधिकारिक ऐप से खाता देखने में मदद कर सकता/सकती हूँ।', 'அங்கிள்/ஆன்ட்டி, அந்த இணைப்பைத் தட்ட வேண்டாம்! வங்கிகள் bit.ly இணைப்புகளை அனுப்புவதில்லை; SMS மூலம் கணக்கை முடக்க மிரட்டுவதில்லை. இது கடவுச்சொல்லைத் திருடும் மோசடி. அதிகாரப்பூர்வ ஆப் மூலம் கணக்கைப் பார்க்க உதவுகிறேன்.'),
      peer: L('Phishing alert! This SMS is a scam to siphon funds. Never click shortened links claiming your bank is blocked. Check the bank app directly.', 'फिशिंग अलर्ट! यह SMS पैसे चुराने की ठगी है। बैंक बंद होने का दावा करने वाले छोटे लिंक पर कभी क्लिक न करें। सीधे बैंक ऐप देखें।', 'ஃபிஷிங் எச்சரிக்கை! இந்த SMS பணத்தைத் திருடும் மோசடி. வங்கி முடக்கப்பட்டதாகக் கூறும் சுருக்கிய இணைப்புகளைத் தட்ட வேண்டாம். வங்கி ஆப்பை நேரடியாகப் பாருங்கள்.'),
      firm: L('SCAM ALERT: Banks never ask for KYC updates over random bit.ly links. Do not click it. Report the sender to 1930, the National Cyber Crime Helpline.', 'ठगी अलर्ट: बैंक कभी random bit.ly लिंक से KYC अपडेट नहीं माँगते। क्लिक न करें। भेजने वाले को 1930 (राष्ट्रीय साइबर क्राइम हेल्पलाइन) पर रिपोर्ट करें।', 'மோசடி எச்சரிக்கை: வங்கிகள் எப்போதும் random bit.ly இணைப்புகள் மூலம் KYC புதுப்பிப்பைக் கேட்பதில்லை. தட்ட வேண்டாம். அனுப்பியவரை 1930 (தேசிய சைபர் க்ரைம் ஹெல்ப்லைன்) இல் புகார் செய்யுங்கள்.')
    },
    card: {
      stamp: L('SCAM', 'ठगी', 'மோசடி'),
      headline: L('Fake bank block and KYC link', 'नकली बैंक ब्लॉक और KYC लिंक', 'போலி வங்கி முடக்கம் மற்றும் KYC இணைப்பு'),
      footer: L('Report phishing · 1930 · cybercrime.gov.in', 'फिशिंग रिपोर्ट · 1930 · cybercrime.gov.in', 'ஃபிஷிங் புகார் · 1930 · cybercrime.gov.in')
    },
    citations: ['RBI', 'Cyber Crime 1930', 'Boom Live']
  },

  isro: {
    key: 'isro',
    threadId: 'NP-7402',
    text: 'ISRO successfully launches next-generation satellite into orbit.',
    verdict: 'true',
    subtype: L('Verified news', 'सत्यापित खबर', 'சரிபார்க்கப்பட்ட செய்தி'),
    confidence: 99,
    risk: 12,
    checks: 38,
    location: L('Sriharikota & Bengaluru', 'श्रीहरिकोटा और बेंगलुरु', 'ஸ்ரீஹரிகோட்டா & பெங்களூரு'),
    isSpike: false,
    title: L('ISRO launches a next-generation satellite', 'ISRO ने अगली पीढ़ी का उपग्रह लॉन्च किया', 'ISRO அடுத்த தலைமுறை செயற்கைக்கோளை விண்ணில் செலுத்தியது'),
    summary: L('This matches official ISRO mission updates and live national coverage. The claim is safe to share.', 'यह ISRO के आधिकारिक मिशन अपडेट और राष्ट्रीय लाइव कवरेज से मेल खाता है। दावा साझा करना सुरक्षित है।', 'இது ISRO அதிகாரப்பூர்வ பணி புதுப்பிப்புகள் மற்றும் தேசிய நேரலை செய்திகளுடன் பொருந்துகிறது. பகிர்வது பாதுகாப்பானது.'),
    primaryTag: 'verification',
    tactics: [
      { key: 'isro', phrase: 'ISRO successfully launches', label: L('Official institutional record', 'आधिकारिक संस्थागत रिकॉर्ड', 'அதிகாரப்பூர்வ நிறுவன பதிவு'), category: L('Trust signal', 'भरोसे का संकेत', 'நம்பிக்கை அறிகுறி'), desc: L('The claim matches ISRO’s own mission page and live broadcast, not an anonymous forward.', 'दावा ISRO के मिशन पेज और लाइव प्रसारण से मेल खाता है, किसी गुमनाम फॉरवर्ड से नहीं।', 'கூற்று ISRO பணி பக்கத்துடனும் நேரலை ஒளிபரப்புடனும் பொருந்துகிறது; அநாமதேய ஃபார்வர்டுடன் அல்ல.'), counter: L('Open the official ISRO mission page and share that source link.', 'आधिकारिक ISRO मिशन पेज खोलें और वही स्रोत लिंक साझा करें।', 'அதிகாரப்பூர்வ ISRO பணி பக்கத்தைத் திறந்து அந்த ஆதார இணைப்பைப் பகிருங்கள்.'), positive: true },
      { key: 'satellite', phrase: 'next-generation satellite', label: L('Specific, checkable detail', 'विशिष्ट, जाँचने योग्य विवरण', 'குறிப்பிட்ட, சரிபார்க்கக்கூடிய விவரம்'), category: L('Verifiable context', 'सत्यापन योग्य संदर्भ', 'சரிபார்க்கக்கூடிய சூழல்'), desc: L('Named mission details make the claim easier to confirm and harder to fake.', 'मिशन का नाम और विवरण दावे को जाँचना आसान और नकली बनाना मुश्किल बनाते हैं।', 'பணியின் பெயர் மற்றும் விவரங்கள் கூற்றைச் சரிபார்க்க எளிதாகவும் போலியாக்க கடினமாகவும் ஆக்குகின்றன.'), counter: L('Check the mission name, launch date and orbit against the official release.', 'मिशन का नाम, लॉन्च तारीख और कक्षा आधिकारिक विज्ञप्ति से मिलाएँ।', 'பணியின் பெயர், ஏவுதல் தேதி மற்றும் சுற்றுப்பாதையை அதிகாரப்பூர்வ அறிவிப்புடன் ஒப்பிடுங்கள்.'), positive: true }
    ],
    facts: {
      en: ['Confirmed by ISRO mission control.', 'Broadcast live by national media.', 'Safe to share with the official source link.'],
      hi: ['ISRO मिशन कंट्रोल से पुष्टि।', 'राष्ट्रीय मीडिया पर लाइव प्रसारण।', 'आधिकारिक स्रोत लिंक के साथ साझा करना सुरक्षित।'],
      ta: ['ISRO பணி கட்டுப்பாட்டு மையம் உறுதிப்படுத்தியது.', 'தேசிய ஊடகங்களில் நேரலை ஒளிபரப்பு.', 'அதிகாரப்பூர்வ ஆதார இணைப்புடன் பகிர்வது பாதுகாப்பு.']
    },
    replies: {
      elder: L('Yes, Uncle/Auntie, this news is genuine. ISRO officially announced the launch and it was shown live from Sriharikota. I can send you the official link if you want to read more.', 'हाँ अंकल/आंटी, यह खबर सच्ची है। ISRO ने लॉन्च की आधिकारिक घोषणा की और श्रीहरिकोटा से लाइव दिखाया गया। चाहें तो मैं आधिकारिक लिंक भेज सकता/सकती हूँ।', 'ஆம் அங்கிள்/ஆன்ட்டி, இந்த செய்தி உண்மை. ISRO ஏவுதலை அதிகாரப்பூர்வமாக அறிவித்து ஸ்ரீஹரிகோட்டாவில் இருந்து நேரலையாகக் காட்டியது. வேண்டுமானால் அதிகாரப்பூர்வ இணைப்பை அனுப்புகிறேன்.'),
      peer: L('Verified real! ISRO confirmed the launch on its official channels. Great milestone for Indian space research — share the official link with the forward.', 'सत्यापित सच! ISRO ने आधिकारिक चैनल पर लॉन्च की पुष्टि की। भारतीय अंतरिक्ष अनुसंधान के लिए बड़ी उपलब्धि — फॉरवर्ड के साथ आधिकारिक लिंक भी भेजें।', 'உண்மை என உறுதி! ISRO அதிகாரப்பூர்வ சேனல்களில் ஏவுதலை உறுதிப்படுத்தியது. இந்திய விண்வெளி ஆய்வுக்கு பெரிய மைல்கல் — அதிகாரப்பூர்வ இணைப்பையும் சேர்த்து அனுப்புங்கள்.'),
      firm: L('Confirmed authentic through the official ISRO mission page and national live broadcast. No correction needed here; please include the source link when sharing.', 'आधिकारिक ISRO मिशन पेज और राष्ट्रीय लाइव प्रसारण से सत्यापित। यहाँ सुधार की ज़रूरत नहीं; साझा करते समय स्रोत लिंक ज़रूर दें।', 'அதிகாரப்பூர்வ ISRO பணி பக்கம் மற்றும் தேசிய நேரலை ஒளிபரப்பு மூலம் உறுதி. இதில் திருத்தம் தேவையில்லை; பகிரும்போது ஆதார இணைப்பைச் சேர்க்கவும்.')
    },
    card: {
      stamp: L('TRUE', 'सच', 'உண்மை'),
      headline: L('ISRO satellite launch verified', 'ISRO उपग्रह लॉन्च सत्यापित', 'ISRO செயற்கைக்கோள் ஏவுதல் உறுதி'),
      footer: L('ISRO mission control · national broadcast', 'ISRO मिशन कंट्रोल · राष्ट्रीय प्रसारण', 'ISRO பணி கட்டுப்பாடு · தேசிய ஒளிபரப்பு')
    },
    citations: ['ISRO', 'PIB', 'DD News']
  },

  gps: {
    key: 'gps',
    threadId: 'NP-7710',
    text: 'New ₹500 note has a hidden GPS chip so the government can track you. RBI confirmed it.',
    verdict: 'misleading',
    subtype: L('Surveillance myth', 'निगरानी मिथक', 'கண்காணிப்பு கட்டுக்கதை'),
    confidence: 94,
    risk: 76,
    checks: 41,
    location: L('Mumbai & Hyderabad', 'मुंबई और हैदराबाद', 'மும்பை & ஹைதராபாத்'),
    isSpike: false,
    title: L('₹500 note with a hidden GPS chip?', '₹500 के नोट में छिपी GPS चिप?', '₹500 நோட்டில் மறைந்த GPS சிப்?'),
    summary: L('The ₹500 note has security features, but no GPS chip. The claim twists a real fact into a surveillance myth.', '₹500 के नोट में सुरक्षा विशेषताएँ हैं, GPS चिप नहीं। दावा असली तथ्य को निगरानी के मिथक में बदल देता है।', '₹500 நோட்டில் பாதுகாப்பு அம்சங்கள் உள்ளன; GPS சிப் இல்லை. உண்மையான தகவலை கண்காணிப்பு கட்டுக்கதையாக மாற்றுகிறது.'),
    primaryTag: 'authority',
    tactics: [
      { key: 'gps', phrase: 'hidden GPS chip', label: L('Techno-fear', 'तकनीकी डर', 'தொழில்நுட்ப பயம்'), category: L('Misleading claim', 'भ्रामक दावा', 'தவறாக வழிநடத்தும் கூற்று'), desc: L('A passive security thread cannot transmit location. A note has no battery or transmitter.', 'सुरक्षा धागा स्थान नहीं भेज सकता। नोट में बैटरी या ट्रांसमीटर नहीं होता।', 'பாதுகாப்பு இழை இருப்பிடத்தை அனுப்ப முடியாது. நோட்டில் பேட்டரியோ டிரான்ஸ்மிட்டரோ இல்லை.'), counter: L('Check RBI’s official security-features page.', 'RBI के आधिकारिक सुरक्षा विशेषताओं वाले पेज को देखें।', 'RBI அதிகாரப்பூர்வ பாதுகாப்பு அம்சங்கள் பக்கத்தைப் பாருங்கள்.'), positive: false },
      { key: 'track', phrase: 'government can track you', label: L('Surveillance panic', 'निगरानी की घबराहट', 'கண்காணிப்பு பதற்றம்'), category: L('Emotional bait', 'भावनात्मक चारा', 'உணர்ச்சி தூண்டில்'), desc: L('Fear of being watched makes the claim spread before anyone checks the physics.', 'निगरानी का डर जाँच से पहले दावा फैला देता है।', 'கண்காணிக்கப்படுகிறோம் என்ற பயம் சரிபார்ப்புக்கு முன் கூற்றை பரப்ப வைக்கும்.'), counter: L('Ask how a chip would transmit without power.', 'पूछें: बिना बिजली चिप कैसे भेजेगी?', 'மின்சாரம் இல்லாமல் சிப் எப்படி அனுப்பும் என்று கேளுங்கள்.'), positive: false },
      { key: 'rbi', phrase: 'RBI confirmed it', label: L('False authority', 'झूठी सत्ता', 'போலி அதிகாரம்'), category: L('Fake citation', 'नकली हवाला', 'போலி மேற்கோள்'), desc: L('No RBI circular mentions GPS chips in currency notes.', 'RBI के किसी परिपत्र में नोटों में GPS चिप का जिक्र नहीं है।', 'நோட்டுகளில் GPS சிப் இருப்பதாக RBI சுற்றறிக்கை எதிலும் இல்லை.'), counter: L('Search the RBI website for the exact circular.', 'RBI वेबसाइट पर असली परिपत्र खोजें।', 'RBI இணையதளத்தில் அசல் சுற்றறிக்கையைத் தேடுங்கள்.'), positive: false }
    ],
    facts: {
      en: ['No GPS chip exists in ₹500 notes.', 'The security thread and microprint are passive features.', 'RBI has issued no such confirmation.'],
      hi: ['₹500 नोटों में कोई GPS चिप नहीं है।', 'सुरक्षा धागा और माइक्रोप्रिंट निष्क्रिय विशेषताएँ हैं।', 'RBI ने ऐसी कोई पुष्टि जारी नहीं की।'],
      ta: ['₹500 நோட்டுகளில் GPS சிப் இல்லை.', 'பாதுகாப்பு இழையும் மைக்ரோபிரிண்டும் செயலற்ற அம்சங்கள்.', 'RBI அத்தகைய உறுதியை வெளியிடவில்லை.']
    },
    replies: {
      elder: L('Uncle/Auntie, please don’t worry — the ₹500 note does not have a GPS chip. The security thread is passive and cannot transmit anything. RBI has not issued any such confirmation.', 'अंकल/आंटी, कृपया चिंता न करें — ₹500 के नोट में GPS चिप नहीं है। सुरक्षा धागा निष्क्रिय है और कुछ नहीं भेज सकता। RBI ने ऐसी कोई पुष्टि जारी नहीं की।', 'அங்கிள்/ஆன்ட்டி, கவலைப்பட வேண்டாம் — ₹500 நோட்டில் GPS சிப் இல்லை. பாதுகாப்பு இழை செயலற்றது; எதையும் அனுப்ப முடியாது. RBI அத்தகைய உறுதியை வெளியிடவில்லை.'),
      peer: L('Myth check: ₹500 notes don’t have GPS chips. The security thread can’t transmit location. RBI hasn’t confirmed anything like this. Don’t forward the panic message.', 'मिथक जाँच: ₹500 नोट में GPS चिप नहीं है। सुरक्षा धागा स्थान नहीं भेज सकता। RBI ने ऐसी कोई पुष्टि नहीं की। घबराहट वाला संदेश फॉरवर्ड न करें।', 'கட்டுக்கதை சரிபார்ப்பு: ₹500 நோட்டில் GPS சிப் இல்லை. பாதுகாப்பு இழை இருப்பிடத்தை அனுப்ப முடியாது. RBI இதுபோன்று உறுதிப்படுத்தவில்லை. பதற்றச் செய்தியை அனுப்ப வேண்டாம்.'),
      firm: L('This is misleading, not a confirmed surveillance feature. Currency notes contain passive security features only. Please check the RBI website before forwarding.', 'यह भ्रामक है, पुष्टि की गई निगरानी विशेषता नहीं। नोटों में केवल निष्क्रिय सुरक्षा विशेषताएँ होती हैं। फॉरवर्ड से पहले RBI वेबसाइट देखें।', 'இது தவறாக வழிநடத்தும் தகவல்; உறுதிப்படுத்தப்பட்ட கண்காணிப்பு அம்சம் அல்ல. நோட்டுகளில் செயலற்ற பாதுகாப்பு அம்சங்கள் மட்டுமே. அனுப்பும் முன் RBI இணையதளத்தைப் பாருங்கள்.')
    },
    card: {
      stamp: L('MISLEADING', 'भ्रामक', 'தவறான தகவல்'),
      headline: L('No GPS chip in ₹500 notes', '₹500 नोट में GPS चिप नहीं', '₹500 நோட்டில் GPS சிப் இல்லை'),
      footer: L('RBI security features · fact-check', 'RBI सुरक्षा विशेषताएँ · फैक्ट-चेक', 'RBI பாதுகாப்பு அம்சங்கள் · ஃபேக்ட் செக்')
    },
    citations: ['RBI', 'PIB Fact Check', 'Boom Live']
  }
};

const THREAD_ORDER = ['health', 'phishing', 'isro', 'gps'];

const ROUND_ORDER = {
  urgency: ['urgency', 'social', 'link', 'authority', 'emotional'],
  link: ['link', 'fear', 'urgency', 'social', 'emotional'],
  verification: ['verification', 'imagery', 'urgency', 'link', 'social'],
  authority: ['authority', 'urgency', 'link', 'social', 'emotional'],
  imagery: ['imagery', 'verification', 'urgency', 'link', 'emotional'],
  emotional: ['emotional', 'social', 'urgency', 'link', 'imagery'],
  social: ['social', 'urgency', 'link', 'emotional', 'imagery'],
  default: ['urgency', 'link', 'imagery', 'social', 'emotional']
};

/* Two questions per manipulation family; the round picks one question per tag. */
const QUESTION_BANK = [
  {
    id: 'q-urgency',
    tags: ['urgency', 'authority'],
    scenario: L('Forwarded voice note', 'फॉरवर्ड किया गया वॉइस नोट', 'அனுப்பப்பட்ட குரல் குறிப்பு'),
    prompt: L('A voice note says boiled pepper water kills 100% of lung viruses and “NASA doctors confirmed it”. What is the safest next step?', 'एक वॉइस नोट कहता है कि उबला काली मिर्च पानी फेफड़ों के वायरस को 100% मार देता है और “NASA डॉक्टरों ने पुष्टि की”। सबसे सुरक्षित अगला कदम क्या है?', 'காய்ச்சிய மிளகு நீர் நுரையீரல் வைரஸ்களை 100% அழிக்கும்; “NASA மருத்துவர்கள் உறுதிப்படுத்தினர்” என்று குரல் குறிப்பு கூறுகிறது. பாதுகாப்பான அடுத்த படி என்ன?'),
    options: [
      L('Forward it to grandparents just in case it helps.', 'बड़ों को भेज दें, शायद मदद करे।', 'பெரியவர்களுக்கு அனுப்புங்கள், உதவலாம்.'),
      L('Pause: “100% cure” and “NASA doctors” are classic urgency and false-authority traps. Verify with a doctor.', 'रुकें: “100% इलाज” और “NASA डॉक्टर” जल्दबाजी व झूठी सत्ता के पुराने जाल हैं। डॉक्टर से पुष्टि करें।', 'நிறுத்துங்கள்: “100% குணம்” மற்றும் “NASA மருத்துவர்கள்” என்பவை அவசரம், போலி அதிகாரப் பொறிகள். மருத்துவரிடம் சரிபார்க்கவும்.'),
      L('Post it in a family group and ask people to decide.', 'फैमिली ग्रुप में डालकर लोगों से फैसला करने को कहें।', 'குடும்ப குழுவில் போட்டு மக்களிடம் முடிவு செய்யச் சொல்லுங்கள்.')
    ],
    correct: 1,
    explanation: L('Scammers borrow prestigious names like NASA or WHO to bypass skepticism. A real cure is not announced through a forward.', 'ठग NASA या WHO जैसे बड़े नामों का इस्तेमाल संदेह दूर करने के लिए करते हैं। असली इलाज फॉरवर्ड से नहीं आता।', 'மோசடியாளர்கள் சந்தேகத்தைக் கடக்க NASA அல்லது WHO போன்ற பெயர்களைப் பயன்படுத்துகிறார்கள். உண்மையான மருந்து ஃபார்வர்டாக வராது.')
  },
  {
    id: 'q-link',
    tags: ['link', 'fear'],
    scenario: L('Bank SMS', 'बैंक SMS', 'வங்கி SMS'),
    prompt: L('An SMS says your account will be blocked tonight unless you update KYC through a shortened link. What do you do?', 'एक SMS कहता है कि छोटे लिंक से KYC अपडेट न करने पर आज रात खाता बंद हो जाएगा। आप क्या करेंगे?', 'சுருக்கிய இணைப்பு மூலம் KYC புதுப்பிக்காவிட்டால் இன்று இரவு கணக்கு முடக்கப்படும் என்று SMS கூறுகிறது. நீங்கள் என்ன செய்வீர்கள்?'),
    options: [
      L('Click quickly so the account is not blocked.', 'जल्दी क्लिक करें ताकि खाता बंद न हो।', 'கணக்கு முடக்கப்படாமல் இருக்க விரைவாகத் தட்டுங்கள்.'),
      L('Open the bank app directly and call the official number on the card.', 'सीधे बैंक ऐप खोलें और कार्ड पर दिए आधिकारिक नंबर पर कॉल करें।', 'வங்கி ஆப்பை நேரடியாகத் திறந்து கார்டில் உள்ள அதிகாரப்பூர்வ எண்ணுக்கு அழைக்கவும்.'),
      L('Reply with your account number to confirm it is real.', 'असली है या नहीं, यह जानने के लिए खाता नंबर भेजें।', 'உண்மையா என்று உறுதிப்படுத்த கணக்கு எண்ணை அனுப்புங்கள்.')
    ],
    correct: 1,
    explanation: L('Banks never demand instant KYC through short links. Opening the official app or calling the number on your card breaks the phishing attempt.', 'बैंक छोटे लिंक से तुरंत KYC नहीं माँगते। आधिकारिक ऐप या कार्ड पर दिया नंबर फिशिंग तोड़ देता है।', 'வங்கிகள் சுருக்கிய இணைப்பு மூலம் உடனடி KYC கேட்பதில்லை. அதிகாரப்பூர்வ ஆப் அல்லது கார்டு எண் ஃபிஷிங்கை முறிக்கும்.')
  },
  {
    id: 'q-imagery',
    tags: ['imagery'],
    scenario: L('Forwarded photo', 'फॉरवर्ड की गई तस्वीर', 'அனுப்பப்பட்ட புகைப்படம்'),
    prompt: L('A bridge-collapse photo is captioned “Happened 10 minutes ago in your city! Government is hiding it!” What is the best check?', 'पुल गिरने की तस्वीर के साथ लिखा है “आपके शहर में 10 मिनट पहले हुआ! सरकार छिपा रही है!” सबसे अच्छी जाँच क्या है?', 'பாலம் இடிந்த படத்துடன் “உங்கள் நகரில் 10 நிமிடங்களுக்கு முன் நடந்தது! அரசு மறைக்கிறது!” என்று உள்ளது. சிறந்த சரிபார்ப்பு எது?'),
    options: [
      L('Reverse-image search and check the original date and location.', 'रिवर्स इमेज सर्च करें और असली तारीख व जगह देखें।', 'படத்தைத் திருப்பித் தேடி அசல் தேதி, இடத்தைப் பாருங்கள்.'),
      L('Forward it so relatives can avoid the route.', 'रिश्तेदारों को भेजें ताकि वे रास्ता बचा सकें।', 'உறவினர்கள் வழியைத் தவிர்க்க அனுப்புங்கள்.'),
      L('Believe it because a photo is attached.', 'फोटो है, इसलिए सच मान लें।', 'புகைப்படம் இருப்பதால் உண்மை என்று நம்புங்கள்.')
    ],
    correct: 0,
    explanation: L('Recycled disaster images are common. A reverse-image search often reveals the original event, date and country.', 'पुरानी आपदा तस्वीरें आम हैं। रिवर्स इमेज सर्च असली घटना, तारीख और देश दिखा देता है।', 'பழைய பேரழிவு படங்கள் பொதுவானவை. திருப்பித் தேடல் அசல் நிகழ்வு, தேதி, நாட்டைக் காட்டும்.')
  },
  {
    id: 'q-social',
    tags: ['social', 'urgency'],
    scenario: L('Free recharge forward', 'मुफ़्त रिचार्ज फॉरवर्ड', 'இலவச ரீசார்ஜ் ஃபார்வர்டு'),
    prompt: L('A message offers free 5G recharge for youth but says “forward to 10 friends to unlock”. What is the tell?', 'एक संदेश युवाओं के लिए मुफ़्त 5G रिचार्ज देता है, पर कहता है “अनलॉक के लिए 10 दोस्तों को भेजें”। मुख्य संकेत क्या है?', 'இளைஞர்களுக்கு இலவச 5G ரீசார்ஜ் தருவதாகக் கூறும் செய்தி “திறக்க 10 நண்பர்களுக்கு அனுப்புங்கள்” என்கிறது. முக்கிய அறிகுறி என்ன?'),
    options: [
      L('It is a chain-forward phishing pattern; legitimate schemes do not require forwarding to unlock.', 'यह चेन फॉरवर्ड फिशिंग है; असली योजनाएँ अनलॉक के लिए फॉरवर्ड नहीं माँगतीं।', 'இது சங்கிலி ஃபார்வர்டு ஃபிஷிங்; உண்மையான திட்டங்கள் திறக்க ஃபார்வர்டு கேட்காது.'),
      L('Click the link to see if your number is eligible.', 'लिंक खोलकर देखें कि नंबर पात्र है या नहीं।', 'உங்கள் எண் தகுதியா என்று பார்க்க இணைப்பைத் தட்டுங்கள்.'),
      L('Forward to 10 friends and then check.', '10 दोस्तों को भेजकर फिर देखें।', '10 நண்பர்களுக்கு அனுப்பிய பிறகு பாருங்கள்.')
    ],
    correct: 0,
    explanation: L('“Forward to unlock” turns recipients into distributors. It is a textbook growth trick for data harvesting and phishing.', '“फॉरवर्ड करके अनलॉक” लोगों को संदेश फैलाने वाला बनाता है। यह डेटा चोरी और फिशिंग का पुराना तरीका है।', '“அனுப்பினால் திறக்கும்” என்பது பெறுநர்களை பரப்புநர்களாக மாற்றும். தரவு திருட்டு, ஃபிஷிங்கின் பழைய தந்திரம்.')
  },
  {
    id: 'q-emotional',
    tags: ['emotional'],
    scenario: L('Chain prayer message', 'चेन प्रार्थना संदेश', 'சங்கிலி பிரார்த்தனை செய்தி'),
    prompt: L('“Send this prayer to 14 people tonight or you will have seven years of bad luck.” What is the right response?', '“आज रात यह प्रार्थना 14 लोगों को भेजें वरना सात साल बदकिस्मती होगी।” सही जवाब क्या है?', '“இன்று இரவு இந்த பிரார்த்தனையை 14 பேருக்கு அனுப்புங்கள்; இல்லையேல் ஏழு ஆண்டு துரதிர்ஷ்டம்.” சரியான பதில் என்ன?'),
    options: [
      L('Forward it to 14 people to be safe.', 'सुरक्षा के लिए 14 लोगों को भेज दें।', 'பாதுகாப்புக்காக 14 பேருக்கு அனுப்புங்கள்.'),
      L('Delete it. Fear and superstition are being used as leverage.', 'इसे हटा दें। डर और अंधविश्वास का दबाव बनाया गया है।', 'நீக்குங்கள். பயமும் மூடநம்பிக்கையும் தூண்டிலாகப் பயன்படுகின்றன.'),
      L('Forward to five people only.', 'सिर्फ़ पाँच लोगों को भेजें।', 'ஐந்து பேருக்கு மட்டும் அனுப்புங்கள்.')
    ],
    correct: 1,
    explanation: L('Chain messages use guilt and fear to force sharing. There is no factual claim to verify — the right move is to break the chain.', 'चेन संदेश अपराध और डर से शेयर करवाते हैं। जाँचने के लिए कोई तथ्य नहीं — चेन तोड़ना सही है।', 'சங்கிலி செய்திகள் குற்ற உணர்வு, பயத்தால் பகிர வைக்கும். சரிபார்க்க உண்மை இல்லை — சங்கிலியை உடைப்பதே சரி.')
  },
  {
    id: 'q-verification',
    tags: ['verification', 'authority'],
    scenario: L('Breaking space news', 'ब्रेकिंग अंतरिक्ष खबर', 'பிரேக்கிங் விண்வெளி செய்தி'),
    prompt: L('A message claims ISRO launched a satellite but has no link, date or mission name. What is the best move?', 'एक संदेश कहता है ISRO ने उपग्रह लॉन्च किया, पर लिंक, तारीख या मिशन का नाम नहीं है। सबसे अच्छा कदम क्या है?', 'ISRO செயற்கைக்கோளை ஏவியதாகக் கூறும் செய்தியில் இணைப்பு, தேதி அல்லது பணியின் பெயர் இல்லை. சிறந்த நடவடிக்கை என்ன?'),
    options: [
      L('Assume it is true because ISRO is credible.', 'ISRO भरोसेमंद है, इसलिए सच मान लें।', 'ISRO நம்பகமானது என்பதால் உண்மை என்று நினைக்கவும்.'),
      L('Check the ISRO site or official handle, then share with the source link.', 'ISRO साइट या आधिकारिक हैंडल देखें, फिर स्रोत लिंक के साथ साझा करें।', 'ISRO தளம் அல்லது அதிகாரப்பூர்வ கைப்பிடியைப் பார்த்து, ஆதார இணைப்புடன் பகிருங்கள்.'),
      L('Forward it immediately as breaking news.', 'इसे तुरंत ब्रेकिंग न्यूज़ की तरह फॉरवर्ड करें।', 'உடனே பிரேக்கிங் செய்தியாக அனுப்புங்கள்.')
    ],
    correct: 1,
    explanation: L('A credible institution is not a substitute for a source. Check the official page and share that link so others can verify too.', 'भरोसेमंद संस्था स्रोत का विकल्प नहीं है। आधिकारिक पेज देखें और वही लिंक साझा करें ताकि दूसरे भी जाँच सकें।', 'நம்பகமான நிறுவனம் ஆதாரத்திற்கு மாற்றல்ல. அதிகாரப்பூர்வ பக்கத்தைப் பார்த்து அந்த இணைப்பைப் பகிருங்கள்; மற்றவர்களும் சரிபார்க்கலாம்.')
  }
];
