package com.oj.job.handler;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollectionUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.oj.common.constants.CacheConstants;
import com.oj.common.constants.Constants;
import com.oj.common.entity.BaseEntity;
import com.oj.job.entity.exam.ExamInfo;
import com.oj.job.entity.message.Message;
import com.oj.job.entity.message.MessageText;
import com.oj.job.entity.message.vo.MessageTextVo;
import com.oj.job.entity.user.UserScore;
import com.oj.job.mapper.exam.ExamMapper;
import com.oj.job.mapper.user.UserExamMapper;
import com.oj.job.mapper.user.UserSubmitMapper;
import com.oj.job.service.IMessageService;
import com.oj.job.service.IMessageTextService;
import com.oj.redis.service.RedisService;
import com.xxl.job.core.handler.annotation.XxlJob;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Component
@Slf4j
public class ExamXxlJob {

    @Autowired
    private ExamMapper examMapper;

    @Autowired
    private UserSubmitMapper userSubmitMapper;

    @Autowired
    private UserExamMapper userExamMapper;

    @Autowired
    private RedisService redisService;

    @Autowired
    private IMessageTextService messageTextService;

    @Autowired
    private IMessageService messageService;

    @XxlJob("examListOrganizeHandler")
    public void examListOrganizeHandler() {
        //统一哪些竞赛应该存入未完赛竞赛列表当中,哪些竞赛应该存入历史竞赛列表当中 统计出来之后,存入对应的缓存当中
        log.info("********examListOrganizeHandler*********");
        LocalDateTime now = LocalDateTime.now();
        List<ExamInfo> unFinishList = examMapper.selectList(new LambdaQueryWrapper<ExamInfo>()
                .select(ExamInfo::getExamId, ExamInfo::getTitle, ExamInfo::getStartTime, ExamInfo::getEndTime)
                .gt(ExamInfo::getEndTime, now)
                .eq(ExamInfo::getStatus, Constants.TRUE)
                .orderByDesc(BaseEntity::getCreateTime));
        refreshCache(unFinishList,CacheConstants.EXAM_UNFINISHED_LIST);
        List<ExamInfo> historyExamList = examMapper.selectList(new LambdaQueryWrapper<ExamInfo>()
                .select(ExamInfo::getExamId, ExamInfo::getTitle, ExamInfo::getStartTime, ExamInfo::getEndTime)
                .le(ExamInfo::getEndTime, now)
                .eq(ExamInfo::getStatus, Constants.TRUE)
                .orderByDesc(ExamInfo::getCreateTime));
        refreshCache(historyExamList,CacheConstants.EXAM_HISTORY_LIST);
    }


    @XxlJob("examResultHandler")
    public void examResultHandler() {
        //围绕竞赛结果
        LocalDateTime now = LocalDateTime.now();
        //得到前一天的时间
        LocalDateTime minusDateTime = now.minusDays(1);

        List<ExamInfo> examInfoList = examMapper.selectList(new LambdaQueryWrapper<ExamInfo>()
                .select(ExamInfo::getExamId, ExamInfo::getTitle)
                .eq(ExamInfo::getStatus, Constants.TRUE)
                .ge(ExamInfo::getEndTime, minusDateTime)
                .le(ExamInfo::getEndTime, now));
        if (CollectionUtil.isEmpty(examInfoList)) {
            return;
        }
        Set<Long> examIdSet = examInfoList.stream().map(ExamInfo::getExamId).collect(Collectors.toSet());
        List<UserScore> userScoreList = userSubmitMapper.selectUserScoreList(examIdSet);
        Map<Long, List<UserScore>> userScoreMap = userScoreList.stream().collect(Collectors.groupingBy(UserScore::getExamId));
        createMessage(examInfoList, userScoreMap);
    }

    private void createMessage(List<ExamInfo> examList, Map<Long, List<UserScore>> userScoreMap) {
        List<MessageText> messageTextList = new ArrayList<>();
        List<Message> messageList = new ArrayList<>();
        for (ExamInfo exam : examList) {
            Long examId = exam.getExamId();
            List<UserScore> userScoreList = userScoreMap.get(examId);
            int totalUser = userScoreList.size();
            int examRank = 1;
            for (UserScore userScore : userScoreList) {
                String msgTitle =  exam.getTitle() + "——排名情况";
                String msgContent = "您所参与的竞赛：" + exam.getTitle()
                        + "，本次参与竞赛一共" + totalUser + "人， 您排名第"  + examRank + "名！";
                userScore.setExamRank(examRank);
                MessageText messageText = new MessageText();
                messageText.setMessageTitle(msgTitle);
                messageText.setMessageContent(msgContent);
                messageText.setCreateBy(Constants.SYSTEM_USER_ID);
                messageTextList.add(messageText);
                Message message = new Message();
                message.setSendId(Constants.SYSTEM_USER_ID);
                message.setCreateBy(Constants.SYSTEM_USER_ID);
                message.setRecId(userScore.getUserId());
                messageList.add(message);
                examRank++;
            }
            userExamMapper.updateUserScoreAndRank(userScoreList);
            redisService.rightPushAll(getExamRankListKey(examId), userScoreList);
        }
        messageTextService.batchInsert(messageTextList);
        Map<String, MessageTextVo> messageTextVOMap = new HashMap<>();
        for (int i = 0; i < messageTextList.size(); i++) {
            MessageText messageText = messageTextList.get(i);
            MessageTextVo messageTextVo = new MessageTextVo();
            BeanUtil.copyProperties(messageText, messageTextVo);
            String msgDetailKey = getMsgDetailKey(messageText.getTextId());
            messageTextVOMap.put(msgDetailKey, messageTextVo);
            Message message = messageList.get(i);
            message.setTextId(messageText.getTextId());
        }
        messageService.batchInsert(messageList);
        //redis 操作
        Map<Long, List<Message>> userMsgMap = messageList.stream().collect(Collectors.groupingBy(Message::getRecId));
        Iterator<Map.Entry<Long, List<Message>>> iterator = userMsgMap.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<Long, List<Message>> entry = iterator.next();
            Long recId = entry.getKey();
            String userMsgListKey = getUserMsgListKey(recId);
            List<Long> userMsgTextIdList = entry.getValue().stream().map(Message::getTextId).toList();
            redisService.rightPushAll(userMsgListKey, userMsgTextIdList);
        }
        redisService.multiSet(messageTextVOMap);
    }



    public void refreshCache(List<ExamInfo> examList, String examListKey) {
        if (CollectionUtil.isEmpty(examList)) {
            // 数据库列表为空也必须删除旧缓存，否则最后一场竞赛结束后会一直残留在未完赛列表中。
            redisService.deleteObject(examListKey);
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

    private String getUserMsgListKey(Long userId) {
        return CacheConstants.USER_MESSAGE_LIST + userId;
    }

    private String getMsgDetailKey(Long textId) {
        return CacheConstants.MESSAGE_DETAIL + textId;
    }

    private String getExamRankListKey(Long examId) {
        return CacheConstants.EXAM_RANK_LIST + examId;
    }
}
