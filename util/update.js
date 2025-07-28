const fs = require('fs');
const { JSDOM } = require('jsdom');

const { people, levels, lastUpdate } = require('./const');

// code-store 레포지토리에서 페이지 번호에 따라 커밋 로그 조회
async function fetchCommits(pageNum) {
    const url = `https://api.github.com/repos/Problem-solve-study/code-store/commits?page=${pageNum}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            console.log('[ERROR] 커밋 조회 요청이 거절됨');
            return null;
        }
        
        return response.json();
    } catch (error) {
        return null;
    }
}

/**
 * 테이블 업데이트
 * 리드미 읽기 -> 커밋 로그 조회 -> 커밋 로그 분석 후 리드미 수정 -> 리드미 저장 -> 가장 최근에 읽은 커밋 저장
 */
async function updateTable() {
    let lastCommitHash;     // 이번 업데이트에서 가장 최근에 읽은 커밋 해시
    let succed = false;     // 플래그: 리드미 저장까지 성공했는지
    let isDone = false;     // 플래그: 과거에 가장 최근에 읽었던 커밋 해시를 만났는지

    console.log("[INFO] 문제 풀이 현황 업데이트 시작");

    /*
    * 리드미 읽기
    * README 파일을 읽어 document를 구성합니다.
    */
    let readmeData;
    try {
        readmeData = await fs.promises.readFile('../profile/README.md', 'utf8');
        console.log('[INFO] README 파일 열기 성공')
    } catch (err) {
        console.error('[ERROR] README 파일 열기 실패: ', err);
        return;
    }

    const dom = new JSDOM(readmeData);
    const document = dom.window.document;


    /**
     * 커밋 로그 분석 & 테이블 업데이트
     * 과거에 가장 최근에 읽었던 커밋을 만날 때까지, 혹은 최대 2페이지의 커밋 로그를 읽어 옵니다.
     * author의 git username, 커밋 메시지의 컨벤션을 기반으로 분석합니다.
     */
    for (let page = 1; page < 4; page++) {
        if (isDone) {
            break;
        }

        // 커밋 로그 조회
        console.log(`[INFO] ${page}번 커밋 페이지 요청`)
        const commits = await fetchCommits(page);

        if (commits == null) {
            console.log("[ERROR] 커밋 조회 실패");
            break;
        }

        // 가장 최근에 읽은 커밋 업데이트: 리드미 저장 후 함께 저장합니다.
        if (page == 1) {
            lastCommitHash = commits[0].sha;
        }

        // 커밋 로그 분석 시작
        commits.forEach(commit => {
            if (isDone) {
                return;
            }

            // if (commit.author == null) {
            //     console.log("[WARN] 무시 - 커밋 작성자 없음");
            //     return;
            // }

            console.log("[Info] 읽은 커밋: ", commit.author.login, commit.commit.message, commit.sha);

            // 과거에 가장 최근에 읽었던 커밋을 만나면 종료
            if (commit.sha === lastUpdate) {
                console.log("[INFO] 종료 = 과거에 완료된 커밋을 만남");
                isDone = true;
                return;
            }

            // 커밋 메시지 분석
            // Solve: {date} {level} 컨벤션에 따라 분석합니다.
            const message = commit.commit.message;
            if (message.split(':')[0].toLowerCase() != 'solve') {
                console.log("[WARN] 무시 - 커밋 태그가 Solve가 아님: ", commit.author.login, commit.commit.message);
                return;
            }

            const tokens = message.split(' ');
            if (tokens.length < 3) {
                console.log("[WARN] 무시 - 잘못된 커밋 메시지: ", message);
                return;
            }
            const dateToken = tokens[1];
            const levelToken = tokens[2];

            // level에 해당하는 levelTag를 찾습니다.
            const level = levels.filter((l) => l.tag == levelToken)[0];
            if (level == null) {
                console.log(`[WARN] 무시 - ${levelToken}에 해당하는 레벨을 찾을 수 없음: `, commit.author.login, commit.commit.message);
                return;
            }

            // commit authort의 username으로 사용자를 찾습니다.
            const person = people.filter(p => p.username === commit.author.login)[0];
            if (person == null) {
                console.log(`[ERROR] 무시 - ${commit.author.login}와 일치하는 사용자가 없음`);
                return;
            }

            // 사용자와 출제 날짜로 태그를 찾습니다.
            const cell = document.querySelector(`.${person.id}-tr .date-${dateToken}-td`);
            if (cell == null) {
                console.log(`[WARN] 무시 - ${person.id} > ${dateToken}인 테이블 셀을 찾을 수 없음: `, commit.author.login, commit.commit.message);
                return;
            }

            // 테이블 업데이트
            // 문제 레벨에 해당하는 이미지 태그를 추가합니다.
            console.log("[Info] 커밋 정보 업데이트: ", commit.author.login, commit.commit.message);
            const levelSpan = cell.getElementsByClassName(level.class)[0];
            levelSpan.innerHTML = level.imgTag;
        });
    }

    /**
     * 리드미 파일 저장
     */
    // html 태그 제거
    let text = dom.serialize();
    text = text.replace(/<html><head><\/head><body>/g, '\n').replace(/<\/body><\/html>/g, '');

    // 리드미 업데이트
    try {
        await fs.promises.writeFile('../profile/README.md', text, 'utf8');
        succed = true;
        console.log('[INFO] README 파일 저장 성공');
    } catch (err) {
        console.error('[ERROR] README 파일 저장 실패:', err);
    }


    /**
     * const 파일 저장
     */
    console.log("[INFO] 마지막 커밋 해시 수정")

    // 테이블이 업데이트 되지 않았을 경우 const 파일 수정 방지
    if (lastCommitHash == null) {
        console.log('[WARN] 무시 - 새로운 커밋이 없음');
        return;
    }

    if (succed == false) {
        console.log('[WARN] 무시 - README 파일 저장에 실패함');
        return;
    }

    // const 파일 읽기
    let constData;
    try {
        constData = await fs.promises.readFile('const.js', 'utf8');
        console.log('[INFO] const 파일 열기 성공');
    } catch (err) {
        console.error('[ERROR] const 파일 열기 실패: ', err);
        return;
    }

    // last commit hash 업데이트
    const modifiedData = constData.replace(/const lastUpdate = '.*';/, `const lastUpdate = '${lastCommitHash}';`);
    
    // const 파일 저장
    try {
        await fs.promises.writeFile('const.js', modifiedData, 'utf8');
        succed = true;
        console.log('[INFO] const 파일 저장 성공: ', lastCommitHash);
    } catch (err) {
        console.error('[ERROR] const 파일 저장 실패:', err);
    }
    

    console.log("[INFO] 문제 풀이 현황 업데이트 완료");
}

updateTable();
