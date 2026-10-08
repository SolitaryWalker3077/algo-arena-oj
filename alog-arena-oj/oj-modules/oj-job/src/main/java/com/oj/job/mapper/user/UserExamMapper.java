package com.oj.job.mapper.user;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.oj.job.entity.user.UserExam;
import com.oj.job.entity.user.UserScore;

import java.util.List;

public interface UserExamMapper extends BaseMapper<UserExam> {


    void updateUserScoreAndRank(List<UserScore> userScoreList);
}
