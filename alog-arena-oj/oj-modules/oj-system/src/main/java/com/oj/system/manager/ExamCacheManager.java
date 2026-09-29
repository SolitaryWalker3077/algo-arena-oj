package com.oj.system.manager;

import com.oj.common.constants.CacheConstants;
import com.oj.redis.service.RedisService;
import com.oj.system.entity.exam.ExamInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ExamCacheManager {

    @Autowired
    private RedisService redisService;

    /**
     * 将新竞赛加入未完赛列表缓存，并写入竞赛详情缓存。
     *
     * @param exam 需要缓存的竞赛信息
     */
    public void addCache(ExamInfo exam) {
        redisService.leftPushForList(getExamListKey(), exam.getExamId());
        redisService.setCacheObject(getDetailKey(exam.getExamId()), exam);
    }

    /**
     * 删除竞赛相关缓存，包括列表项、竞赛详情和竞赛题目列表。
     *
     * @param examId 竞赛 ID
     */
    public void deleteCache(Long examId) {
        redisService.removeForList(getExamListKey(), examId);
        redisService.deleteObject(getDetailKey(examId));
        redisService.deleteObject(getExamQuestionListKey(examId));
    }

    /**
     * 获取未完赛竞赛列表的缓存键。
     *
     * @return Redis 列表键
     */
    private String getExamListKey() {
        return CacheConstants.EXAM_UNFINISHED_LIST;
    }

    /**
     * 生成指定竞赛的详情缓存键。
     *
     * @param examId 竞赛 ID
     * @return Redis 详情键
     */
    private String getDetailKey(Long examId) {
        return CacheConstants.EXAM_DETAIL + examId;
    }

    /**
     * 生成指定竞赛的题目列表缓存键。
     *
     * @param examId 竞赛 ID
     * @return Redis 题目列表键
     */
    private String getExamQuestionListKey(Long examId) {
        return CacheConstants.EXAM_QUESTION_LIST + examId;
    }

}
