const starterCode = `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        // 在这里编写你的代码
    }
}`

export const demoQuestions = [
  { questionId: '1001', title: '两数之和', difficulty: 1, acceptedRate: 72, tags: ['数组', '哈希表'] },
  { questionId: '1002', title: '反转链表', difficulty: 1, acceptedRate: 68, tags: ['链表', '递归'] },
  { questionId: '1003', title: '最长无重复子串', difficulty: 2, acceptedRate: 49, tags: ['字符串', '滑动窗口'] },
  { questionId: '1004', title: '二叉树的层序遍历', difficulty: 2, acceptedRate: 61, tags: ['树', '广度优先搜索'] },
  { questionId: '1005', title: '合并区间', difficulty: 2, acceptedRate: 53, tags: ['排序', '数组'] },
  { questionId: '1006', title: '接雨水', difficulty: 3, acceptedRate: 39, tags: ['双指针', '单调栈'] },
  { questionId: '1007', title: '岛屿数量', difficulty: 2, acceptedRate: 58, tags: ['图', '深度优先搜索'] },
  { questionId: '1008', title: '编辑距离', difficulty: 3, acceptedRate: 44, tags: ['动态规划', '字符串'] },
  { questionId: '1009', title: '有效的括号', difficulty: 1, acceptedRate: 76, tags: ['栈', '字符串'] },
  { questionId: '1010', title: '最小覆盖子串', difficulty: 3, acceptedRate: 35, tags: ['哈希表', '滑动窗口'] },
  { questionId: '1011', title: '课程表', difficulty: 2, acceptedRate: 51, tags: ['图', '拓扑排序'] },
  { questionId: '1012', title: 'LRU 缓存', difficulty: 3, acceptedRate: 46, tags: ['设计', '双向链表'] },
]

export const demoQuestionDetail = {
  questionId: '1001',
  title: '两数之和',
  difficulty: 1,
  timeLimit: 1000,
  spaceLimit: 262144,
  tags: ['数组', '哈希表'],
  description: '给定一个整数数组 nums 和一个整数目标值 target，请在数组中找出和为目标值的两个整数，并返回它们的下标。你可以假设每种输入只会对应一个答案，并且同一个元素不能重复使用。',
  inputDescription: '第一行输入数组长度 n，第二行输入 n 个整数，第三行输入目标值 target。',
  outputDescription: '输出两个整数，表示满足条件的元素下标。',
  examples: [
    { input: '4\n2 7 11 15\n9', output: '0 1', explanation: 'nums[0] + nums[1] = 9。' },
    { input: '3\n3 2 4\n6', output: '1 2', explanation: 'nums[1] + nums[2] = 6。' },
  ],
  defaultCode: starterCode,
}

export const demoMessages = [
  { messageId: 'm1', messageTitle: '欢迎来到 Algo Arena', messageContent: '你的学习空间已经准备就绪，从题库选择一道题开始今天的训练吧。', createTime: '2026-10-03 09:30', read: false, type: 'system' },
  { messageId: 'm2', messageTitle: '竞赛报名成功', messageContent: '你已成功报名「秋季算法挑战赛」，请提前十分钟进入答题页面。', createTime: '2026-10-02 18:20', read: false, type: 'contest' },
  { messageId: 'm3', messageTitle: '本周学习报告', messageContent: '本周完成 8 道题，连续学习 5 天。保持节奏，下周继续加油！', createTime: '2026-09-29 20:00', read: true, type: 'report' },
  { messageId: 'm4', messageTitle: '代码评测完成', messageContent: '题目「最长无重复子串」已通过全部测试用例，用时 42 ms。', createTime: '2026-09-28 16:42', read: true, type: 'judge' },
  { messageId: 'm5', messageTitle: '系统维护通知', messageContent: '评测服务将于本周日 02:00 至 03:00 进行例行维护。', createTime: '2026-09-26 11:10', read: true, type: 'system' },
]

export const demoProfile = {
  userId: 'preview-user',
  nickName: '算法新星',
  headImage: '',
  sex: 1,
  phone: '138****8888',
  email: 'coder@example.com',
  wechat: '',
  schoolName: 'Algo Arena 大学',
  majorName: '计算机科学与技术',
  introduce: '保持好奇，持续练习，用代码解决真实问题。',
}

export const demoRanking = [
  { rank: 1, userId: 'u1', nickName: 'ByteRunner', solved: 6, penalty: 318, score: 600 },
  { rank: 2, userId: 'u2', nickName: '栈上漫步', solved: 6, penalty: 347, score: 600 },
  { rank: 3, userId: 'u3', nickName: 'NorthStar', solved: 5, penalty: 266, score: 500 },
  { rank: 4, userId: 'u4', nickName: '递归旅人', solved: 5, penalty: 301, score: 500 },
  { rank: 5, userId: 'u5', nickName: 'CloudCoder', solved: 4, penalty: 229, score: 400 },
  { rank: 6, userId: 'u6', nickName: '指针同学', solved: 4, penalty: 284, score: 400 },
  { rank: 7, userId: 'u7', nickName: 'GreenTea', solved: 3, penalty: 198, score: 300 },
  { rank: 8, userId: 'u8', nickName: 'HelloWorld', solved: 3, penalty: 245, score: 300 },
]

export function createDemoQuestion(questionId) {
  const summary = demoQuestions.find((item) => String(item.questionId) === String(questionId))
  return {
    ...demoQuestionDetail,
    ...summary,
    questionId: String(questionId || demoQuestionDetail.questionId),
  }
}

