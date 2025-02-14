import axios from "axios";

const YOUTUBE_API_KEY = "";

async function getYoutubeVideoLinks(region, theme) {
  // 요청 파라미터 구성 (최대 3개의 결과 요청)
  const searchParams = new URLSearchParams({
    part: "snippet",
    q: `${region} ${theme} 브이로그`,
    order: "relevance", // 관련성 기준 정렬
    maxResults: "3", // 최대 3개의 결과 요청
    type: "video", // 영상만 검색
    videoDuration: "medium",
    videoEmbeddable: "true",
    key: YOUTUBE_API_KEY, // API 키 (전역변수 또는 설정된 환경변수)
  });
  const requestUrl = `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`;

  try {
    // axios를 사용하여 YouTube Search API 호출
    const searchResponse = await axios.get(requestUrl);
    const searchData = searchResponse.data;

    if (!searchData.items || searchData.items.length === 0) {
      throw new Error("검색 결과가 없습니다.");
    }

    // 검색 결과에서 유효한 videoId를 가진 항목들에 대해 URL 생성
    const videoUrls = searchData.items
      .filter((item) => item && item.id && item.id.videoId)
      .map((item) => `https://www.youtube.com/watch?v=${item.id.videoId}`);

    return { urls: videoUrls };
  } catch (error) {
    console.error("유튜브 영상 검색 실패:", error);
    throw error;
  }
}

// // 사용 예시
// console.log("액티비티");
// await getYoutubeVideoLinks("제주", "액티비티")
//   .then((result) => console.log(result))
//   .catch((err) => console.error(err));
