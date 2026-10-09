package com.oj.job.mapper.user;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.oj.job.entity.user.UserScore;
import com.oj.job.entity.user.UserSubmit;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Set;

public interface UserSubmitMapper extends BaseMapper<UserSubmit> {

    List<UserScore> selectUserScoreList(@Param("examIdSet") Set<Long> examIdSet);

    List<Long> selectHostQuestionList();


}
