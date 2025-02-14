import CircularQueue from "./src/CircularQueue.js";
// import axios from "https://cdn.skypack.dev/axios";
import axios from "axios";

const GEMINI_API_KEY = "AIzaSyBfYaQ5UEGh3lZvLZRoPpVekc6ekpw8nFA";

// Gemini 모델 리스트
const geminiModels = [
  "gemini-2.0-flash-001",
  "gemini-2.0-pro-exp-02-05",
  "gemini-2.0-flash-exp",
  "gemini-1.5-pro",
  "gemini-exp-1206",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
];

const modelQueue = new CircularQueue(geminiModels);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestAPI(url, prompt, modelName, action, generationConfig) {
  const response = await axios.post(
    url,
    { contents: [{ parts: [{ text: prompt }] }], generationConfig },
    { headers: { "Content-Type": "application/json" } }
  );
  return response.data.candidates[0].content.parts[0].text;
}

async function retryPrompt(url, prompt, action, generationConfig, autoSearch) {
  while (true) {
    // 2초 대기
    await sleep(2000);

    // 모델 큐를 회전시키고 새로운 모델 선택
    modelQueue.rotateQueue();
    const newModelName = modelQueue.peek();
    console.log("재시도: 모델", newModelName, "로 요청합니다.");

    try {
      const result = await requestAPI(
        url,
        prompt,
        newModelName,
        action,
        generationConfig
      );
      return result; // 성공하면 결과 반환
    } catch (error) {
      console.error("모델", newModelName, "요청 실패:", error);
      // 에러가 발생하면 루프를 계속 진행하여 다음 모델로 재시도
    }
  }
}

const callModel = async ({
  url,
  prompt,
  modelName,
  action = "generateContent",
  generationConfig = {},
  autoSearch = true,
}) => {
  console.log("요청 모델:", modelName, "\n프롬프트:", prompt);
  try {
    return await requestAPI(url, prompt, modelName, action, generationConfig);
  } catch (error) {
    console.error("모델", modelName, "요청 중 에러 발생:", error);
    // 재시도 시에는 원본 프롬프트, 액션, 생성 옵션, 자동 검색 여부를 그대로 전달합니다.
    return await retryPrompt(url, prompt, action, generationConfig, autoSearch);
  }
};

async function runModelChain(theme, region) {
  const modelName = modelQueue.peek();
  const action = "generateContent";
  const generationConfig = {
    response_mime_type: "application/json",
    response_schema: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          day: { type: "INTEGER" }, // 여행 몇 일 차인지
          title: { type: "STRING" }, // 일정 제목
          schedule: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                time: {
                  type: "STRING",
                  pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$",
                },
                destination: { type: "STRING" },
                address: { type: "STRING" },
                activity: { type: "STRING" },
                description: { type: "STRING" },
                duration: { type: "STRING" },
              },
              required: [
                "time",
                "duration",
                "destination",
                "activity",
                "description",
              ],
            },
          },
        },
        required: ["day", "title", "schedule"],
      },
    },
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:${action}?key=${GEMINI_API_KEY}`;

  // 1단계: 테마, 지역에 어울리는 일정 추천
  const schedule = await callModel({
    url,
    prompt: `${theme} 테마에 어울리는 ${region}지역 여행 일정을 주변 맛집, 관광지를 포함해서 추천해주세요. `,
    modelName: modelQueue.peek(),
    generationConfig,
  }).then((response) => response);

  console.log(schedule);
}

// 이 부분에서 async 함수를 실행합니다.
runModelChain("액티비티 여행", "부산");

/*
generationConfig: {
      response_mime_type: "application/json",
      response_schema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            day: { type: "INTEGER" }, // 여행 몇 일 차인지
            title: { type: "STRING" }, // 일정 제목
            schedule: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  time: {
                    type: "STRING",
                    pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$",
                  },
                  destination: { type: "STRING" },
                  address: { type: "STRING" },
                  activity: { type: "STRING" },
                  description: { type: "STRING" },
                  duration: { type: "STRING" },
                },
                required: [
                  "time",
                  "duration",
                  "destination",
                  "activity",
                  "description",
                ],
              },
            },
          },
          required: ["day", "title", "schedule"],
        },
      },
    },
  }

*/
