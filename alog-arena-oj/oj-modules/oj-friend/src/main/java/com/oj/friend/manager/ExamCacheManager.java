package com.oj.friend.manager;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.collection.CollectionUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.github.pagehelper.PageHelper;
import com.oj.common.constants.CacheConstants;
import com.oj.common.constants.Constants;
import com.oj.common.enums.ExamListType;
import com.oj.common.enums.ResultCode;
import com.oj.friend.entity.exam.ExamInfo;
import com.oj.friend.entity.exam.ExamQuestionInfo;
import com.oj.friend.entity.exam.dto.ExamQueryDto;
import com.oj.friend.entity.exam.vo.ExamVo;
import com.oj.friend.entity.user.UserExamInfo;
import com.oj.friend.mapper.exam.ExamMapper;
import com.oj.friend.mapper.exam.ExamQuestionMapper;
import com.oj.friend.mapper.user.UserExamMapper;
import com.oj.redis.service.RedisService;
import com.oj.security.expection.ServiceException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Component
public class ExamCacheManager {

    @Autowired
    private ExamMapper examMapper;

    @Autowired
    private RedisService redisService;

    @Autowired
    private UserExamMapper userExamMapper;

    @Autowired
    private ExamQuestionMapper examQuestionMapper;

    /**
     * 获取指定类型的竞赛列表缓存数量。
     *
     * @param examListType 竞赛列表类型
     * @return 缓存中的竞赛数量
     */
    public Long getListSize(Integer examListType,Long userId) {
        String examListKey = getExamListKey(examListType,userId);
        return redisService.getListSize(examListKey);
    }

    /**
     * 获取竞赛题目列表缓存数量
     * @param examId 竞赛id
     * */
    public Long getExamQuestionListSize(Long examId) {
        String examQuestionListKey = getExamQuestionListKey(examId);
        return redisService.getListSize(examQuestionListKey);
    }

    /**
     * 分页获取竞赛列表，优先从 Redis 读取；缓存缺失或数据不完整时回源数据库并刷新缓存。
     *
     * @param examQueryDTO 竞赛列表查询条件
     * @return 当前页竞赛列表
     */
    public List<ExamVo> getExamVOList(ExamQueryDto examQueryDTO,Long userId) {
        int start = (examQueryDTO.getPageNum() - 1) * examQueryDTO.getPageSize();
        int end = start + examQueryDTO.getPageSize() - 1; //下标需要 -1
        String examListKey = getExamListKey(examQueryDTO.getType(), userId);
        List<Long> examIdList = redisService.getCacheListByRange(examListKey, start, end, Long.class);
        List<ExamVo> examVOList = assembleExamVOList(examIdList);
        if (CollectionUtil.isEmpty(examVOList)) {
            //说明redis中数据可能有问题 从数据库中查数据并且重新刷新缓存
            examVOList = getExamListByDB(examQueryDTO,userId); //从数据库中获取数据
            refreshCache(examQueryDTO.getType(), userId);
        }
        return examVOList;
    }


    public List<Long> getAllUserExamList(Long userId) {
        String examListKey = CacheConstants.USER_EXAM_LIST + userId;
        List<Long> userExamIdList = redisService.getCacheListByRange(examListKey, 0, -1, Long.class);
        if (CollectionUtil.isNotEmpty(userExamIdList)) {
            return userExamIdList;
        }
        List<UserExamInfo> userExamInfoList =
                userExamMapper.selectList(new LambdaQueryWrapper<UserExamInfo>().eq(UserExamInfo::getUserId, userId));
        if (CollectionUtil.isEmpty(userExamInfoList)) {
            return null;
        }
        refreshCache(ExamListType.USER_EXAM_LIST.getValue(),userId);
        return userExamInfoList.stream().map(UserExamInfo::getExamId).collect(Collectors.toList());
    }

    public void addUserExamCache(Long userId,Long examId) {
        String userExamListKey = getUserExamListKey(userId);
        // 仅更新已经完整建立的用户列表缓存。缓存不存在时由列表查询从数据库全量回填，
        // 避免为已有多条报名记录的用户创建一个只包含本次报名的不完整列表。
        if (Boolean.TRUE.equals(redisService.hasKey(userExamListKey))) {
            redisService.leftPushForList(userExamListKey, examId);
        }
    }

    /**
     * 根据竞赛列表类型从数据库加载有效竞赛，并重建列表缓存和详情缓存。
     *
     * @param examListType 竞赛列表类型
     */
    public void refreshCache(Integer examListType,Long userId) {
        List<ExamInfo> examList = new ArrayList<>();
        if (ExamListType.EXAM_UN_FINISH_LIST.getValue().equals(examListType)) {
            //查询未完赛的竞赛列表
            examList = examMapper.selectList(new LambdaQueryWrapper<ExamInfo>()
                    .select(ExamInfo::getExamId, ExamInfo::getTitle, ExamInfo::getStartTime, ExamInfo::getEndTime)
                    .gt(ExamInfo::getEndTime, LocalDateTime.now())
                    .eq(ExamInfo::getStatus, Constants.TRUE)
                    .orderByDesc(ExamInfo::getCreateTime));
        } else if (ExamListType.EXAM_HISTORY_LIST.getValue().equals(examListType)) {
            //查询历史竞赛
            examList = examMapper.selectList(new LambdaQueryWrapper<ExamInfo>()
                    .select(ExamInfo::getExamId, ExamInfo::getTitle, ExamInfo::getStartTime, ExamInfo::getEndTime)
                    .le(ExamInfo::getEndTime, LocalDateTime.now())
                    .eq(ExamInfo::getStatus, Constants.TRUE)
                    .orderByDesc(ExamInfo::getCreateTime));
        } else if (ExamListType.USER_EXAM_LIST.getValue().equals(examListType)) {
            List<ExamVo> examVoList = userExamMapper.selectUserExamList(userId);
            examList = BeanUtil.copyToList(examVoList, ExamInfo.class);
        }
        if (CollectionUtil.isEmpty(examList)) {
            // 空结果同样代表一次有效刷新，需要清除可能存在的旧列表缓存。
            redisService.deleteObject(getExamListKey(examListType, userId));
            return;
        }

        Map<String, ExamInfo> examMap = new HashMap<>();
        List<Long> examIdList = new ArrayList<>();
        for (ExamInfo exam : examList) {
            examMap.put(getDetailKey(exam.getExamId()), exam);
            examIdList.add(exam.getExamId());
        }
        redisService.multiSet(examMap);  //刷新详情缓存
        redisService.deleteObject(getExamListKey(examListType,userId));
        redisService.rightPushAll(getExamListKey(examListType,userId), examIdList);      //刷新列表缓存
    }

    /**
     * 刷新竞赛题目列表缓存
     * */
    public void refreshExamQuestionCache(Long examId) {
        List<ExamQuestionInfo> examQuestionList = examQuestionMapper.selectList(new LambdaQueryWrapper<ExamQuestionInfo>()
                .select(ExamQuestionInfo::getQuestionId)
                .eq(ExamQuestionInfo::getExamId, examId)
                .orderByAsc(ExamQuestionInfo::getQuestionOrder));
        if (CollectionUtil.isEmpty(examQuestionList)) {
            return;
        }
        List<Long> examQuestionIdList = examQuestionList.stream().map(ExamQuestionInfo::getQuestionId).toList();
        redisService.rightPushAll(getExamQuestionListKey(examId), examQuestionIdList);
        //节省 redis缓存资源
        long seconds = ChronoUnit.SECONDS.between(LocalDateTime.now(),
                LocalDateTime.now().plusDays(1).withHour(0).withMinute(0).withSecond(0).withNano(0));
        redisService.expire(getExamQuestionListKey(examId), seconds, TimeUnit.SECONDS);
    }


    /**
     * 按查询条件从数据库分页查询竞赛列表。
     *
     * @param examQueryDto 竞赛列表查询条件
     * @return 当前页竞赛列表
     */
    private List<ExamVo> getExamListByDB(ExamQueryDto examQueryDto,Long userId) {
        PageHelper.startPage(examQueryDto.getPageNum(), examQueryDto.getPageSize());
        if(ExamListType.USER_EXAM_LIST.getValue().equals(examQueryDto.getType())) {
            //查询我的竞赛列表
            //查询我的竞赛列表
            return userExamMapper.selectUserExamList(userId);
        } else {
            //查询C端的竞赛列表
            return examMapper.selectExamList(examQueryDto);
        }

    }

    /**
     * 从redis当中获取首道题目
     * */
    public Long getFirstQuestion(Long examId) {
        return redisService.indexForList(getExamQuestionListKey(examId),0, Long.class);
    }
    //获取上一题
    public Long getPreQuestion(Long examId, Long questionId) {
        Long index = redisService.indexOfForList(getExamQuestionListKey(examId), questionId);
        if (index == 0) {
            throw new ServiceException(ResultCode.FAILED_FIRST_QUESTION);
        }
        return redisService.indexForList(getExamQuestionListKey(examId), index - 1, Long.class);
    }
    //获取下一题
    public Long getNextQuestion(Long examId, Long questionId) {
        Long index = redisService.indexOfForList(getExamQuestionListKey(examId), questionId);
        long lastIndex = getExamQuestionListSize(examId) - 1;
        if (index == lastIndex) {
            throw new ServiceException(ResultCode.FAILED_LAST_QUESTION);
        }
        return redisService.indexForList(getExamQuestionListKey(examId), index + 1, Long.class);
    }

    /**
     * 根据竞赛 ID 列表批量读取详情缓存，并校验详情数量是否完整。
     *
     * @param examIdList 竞赛 ID 列表
     * @return 完整的竞赛详情列表；缓存缺失或不完整时返回 {@code null}
     */
    private List<ExamVo> assembleExamVOList(List<Long> examIdList) {
        if (CollectionUtil.isEmpty(examIdList)) {
            //说明redis当中没数据 从数据库中查数据并且重新刷新缓存
            return null;
        }
        //拼接redis当中key的方法 并且将拼接好的key存储到一个list中
        List<String> detailKeyList = new ArrayList<>();
        for (Long examId : examIdList) {
            detailKeyList.add(getDetailKey(examId));
        }
        List<ExamVo> examVOList = redisService.multiGet(detailKeyList, ExamVo.class);
        CollUtil.removeNull(examVOList);
        if (CollectionUtil.isEmpty(examVOList) || examVOList.size() != examIdList.size()) {
            //说明redis中数据有问题 从数据库中查数据并且重新刷新缓存
            return null;
        }
        return examVOList;
    }

    /**
     * 根据竞赛列表类型获取对应的 Redis 列表键。
     *
     * @param examListType 竞赛列表类型
     * @return Redis 列表键；类型不受支持时返回空字符串
     */
    private String getExamListKey(Integer examListType,Long userId) {
        if (ExamListType.EXAM_UN_FINISH_LIST.getValue().equals(examListType)) {
            return CacheConstants.EXAM_UNFINISHED_LIST;
        } else if (ExamListType.EXAM_HISTORY_LIST.getValue().equals(examListType)) {
            return CacheConstants.EXAM_HISTORY_LIST;
        } else {
            return CacheConstants.USER_EXAM_LIST + userId;
        }
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


    private String getUserExamListKey(Long userId) {
        return CacheConstants.USER_EXAM_LIST + userId;
    }

    private String getExamQuestionListKey(Long examId) {
        return CacheConstants.EXAM_QUESTION_LIST + examId;
    }



}
