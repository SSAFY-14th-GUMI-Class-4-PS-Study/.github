const people = [
    { id: "kmc", name: "김민찬", username: "murphybread" },
    { id: "kjh", name: "김재환", username: "Calli-T" },
    { id: "kkb", name: "권기범", username: "Min-code0202" },
    { id: "jjm", name: "정재민", username: "kiryanchi" },
    { id: "jsh", name: "전상훈", username: "iamreward00" },
    { id: "smj", name: "성민제", username: "smj1513" },
];

const levels = [
    { class: 'easy', tag: 'E', imgTag: '<img src="silver.svg" height="20px" />'},
    { class: 'normal', tag: 'N', imgTag: '<img src="gold.svg" height="20px" />'},
    { class: 'hard', tag: 'H', imgTag: '<img src="platinum.svg" height="20px" />'},
]

const blankImgTag ='<img src="blank.svg" height="20px" />';

const lastUpdate = '97f8151e522446d7bf7de96231b57c71cae1cf5f';

module.exports = { people, levels, lastUpdate, blankImgTag };

