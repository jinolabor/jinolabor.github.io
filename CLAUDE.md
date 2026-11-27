# 작업 규칙 (jinolabor.github.io)

노무그룹지노 TEAM JINO 프로그램을 올리는 곳입니다. 주소는 `https://jinolabor.github.io/<폴더>/` 입니다.

| 폴더 | 프로그램 | 예전 위치 (더 이상 고치지 않음) |
|---|---|---|
| `address/` | 거래처 주소록 | dhkim0629-ops/dhkim0629-ops.github.io `address/` |
| `law/` | **옮김 → https://jino-member.com** (저장소 `jinolabor/jino-member`). 여기에는 이동 화면만 둡니다 | dhkim0629-ops/dhkim0629-ops.github.io `law/` |
| `contract/` | 근로계약서 작성 | dhkim0629-ops/config-files `contract/` |
| `forms/` | 스마트지노 문서작성 | dhkim0629-ops/config-files `forms/` |
| `safety/` | 지노 중처법 이행관리 (안전보건 통합관리) | dhkim0629-ops/jino-safety |
| `leave/` | **주소록으로 합침** → `address/` 의 「연차 · 팀달력」 탭 (`address/#leave`). 여기에는 이동 화면만 둡니다. 서버 함수 `leave_*`·`event_*`·`team_names`·`leave_seen` 그대로, 주소록 안에서는 별도 `<script>` 모듈 `window.JinoLeave`(start/stop/reload/notice)로 동작. 대표·팀장(`leave_managers`)은 연차 대상 아님 | 없음 |
| `community/` | **주소록으로 합침** → `address/` 의 「TEAM JINO 커뮤니티」 탭 (`address/#community`). 모듈은 `community/jino-comm.js`·`jino-comm.css` 두 파일에만 있고 주소록이 불러 씁니다 — 커뮤니티를 고칠 때는 이 두 파일을 고칩니다. `community/index.html` 은 이동 화면만 둡니다. 서버 함수 `comm_*`, 화면 이름 `jc-`, 탭을 처음 열 때 `JinoComm.init`. 카카오 지도 키는 주소록의 `KAKAO_JS_KEY` | 없음 (새로 만듦) |

다른 프로그램: 보험료정산은 `jinolabor/settlement`, 페이롤은 `jinolabor/payroll` (https://jinolabor.github.io/payroll/).

## 고치기 전에 꼭
1. **이 저장소의 최신 내용을 받은 뒤 고칩니다.** 예전 위치나 예전 대화, 내 컴퓨터에 남은 복사본으로 덮어쓰지 않습니다. 여러 대화에서 같은 저장소를 고칩니다.
2. **예전 위치에는 올리지 않습니다.** 예전 주소는 "주소가 바뀌었습니다" 안내 화면만 남기고 정리합니다.
3. **열쇠 파일(key.json) 주소 순서를 바꾸지 않습니다.** jinolabor 조직 주소를 먼저, 안 되면 예전 주소를 읽습니다.
   ```
   https://raw.githubusercontent.com/jinolabor/config-files/main/key.json
   https://raw.githubusercontent.com/dhkim0629-ops/config-files/main/key.json
   ```
   `jinolabor/config-files`는 JINO 열쇠 관리가 그 위치에 저장하도록 바뀐 뒤에만 만듭니다. 그 전에 복사본을 두면 퇴사자를 지워도 막히지 않습니다.
4. **로그인으로 잠긴 프로그램(contract, forms)은 잠긴 포장본만 올립니다.** 잠금 없는 원본을 올리지 않습니다. 원본은 각 비공개 원본 저장소(jino-○○-src 등)에 보관합니다.
5. 비밀번호, 마스터키, 고객사 데이터는 절대 올리지 않습니다. 이 저장소는 공개입니다.

## 용어
사무소 구성원은 '직원'이 아니라 'TEAM JINO'(구성원)로 씁니다.
