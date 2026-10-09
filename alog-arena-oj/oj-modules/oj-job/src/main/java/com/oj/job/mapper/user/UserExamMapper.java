package com.oj.job.mapper.user;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.oj.job.entity.user.UserExam;
import com.oj.job.entity.user.UserScore;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface UserExamMapper extends BaseMapper<UserExam> {


    void updateUserScoreAndRank(@Param("userScoreList") List<UserScore> userScoreList);
}
