package com.oj.friend.mapper.user;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.oj.friend.entity.exam.vo.ExamRankVo;
import com.oj.friend.entity.exam.vo.ExamVo;
import com.oj.friend.entity.user.UserExamInfo;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface UserExamMapper extends BaseMapper<UserExamInfo> {
    List<ExamVo> selectUserExamList(@Param("userId") Long userId);

    List<ExamRankVo> selectExamRankList(Long examId);
}
