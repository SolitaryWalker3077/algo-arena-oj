package com.oj.job.handler;

import cn.hutool.core.collection.CollectionUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.oj.common.constants.CacheConstants;
import com.oj.common.constants.Constants;
import com.oj.common.entity.BaseEntity;
import com.oj.common.enums.ExamListType;
import com.oj.job.entity.ExamInfo;
import com.oj.job.mapper.ExamMapper;
import com.oj.redis.service.RedisService;
import com.xxl.job.core.handler.annotation.XxlJob;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class ExamXxlJob {

    @Autowired
    private ExamMapper examMapper;

    @Autowired
    private RedisService redisService;


    @XxlJob("examListOrganizeHandler")
    public void examListOrganizeHandler() {
        //统一哪些竞赛应该存入未完赛竞赛列表当中,哪些竞赛应该存入历史竞赛列表当中 统计出来之后,存入对应的缓存当中
        log.info("********examListOrganizeHandler*********");
        List<ExamInfo> unFinishList = examMapper.selectList(new LambdaQueryWrapper<ExamInfo>()
                .select(ExamInfo::getExamId, ExamInfo::getTitle, ExamInfo::getStartTime, ExamInfo::getEndTime)
                .gt(ExamInfo::getEndTime, LocalDateTime.now())
                .eq(ExamInfo::getStatus, Constants.TRUE)
                .orderByDesc(BaseEntity::getCreateTime));
        refreshCache(unFinishList,CacheConstants.EXAM_UNFINISHED_LIST);
        List<ExamInfo> historyExamList = examMapper.selectList(new LambdaQueryWrapper<ExamInfo>()
                .select(ExamInfo::getExamId, ExamInfo::getTitle, ExamInfo::getStartTime, ExamInfo::getEndTime)
                .le(ExamInfo::getEndTime, LocalDateTime.now())
                .eq(ExamInfo::getStatus, Constants.TRUE)
                .orderByDesc(ExamInfo::getCreateTime));
        refreshCache(historyExamList,CacheConstants.EXAM_HISTORY_LIST);
    }

    public void refreshCache(List<ExamInfo> examList, String examListKey) {
        if (CollectionUtil.isEmpty(examList)) {
            return;
        }

        Map<String, ExamInfo> examMap = new HashMap<>();
        List<Long> examIdList = new ArrayList<>();
        for (ExamInfo exam : examList) {
            examMap.put(getDetailKey(exam.getExamId()), exam);
            examIdList.add(exam.getExamId());
        }
        redisService.multiSet(examMap);  //刷新详情缓存
        redisService.deleteObject(examListKey);
        redisService.rightPushAll(examListKey, examIdList);      //刷新列表缓存
    }

    private String getDetailKey(Long examId) {
        return CacheConstants.EXAM_DETAIL + examId;
    }
}
