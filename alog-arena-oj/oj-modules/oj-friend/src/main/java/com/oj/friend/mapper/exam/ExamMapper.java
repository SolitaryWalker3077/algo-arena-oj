package com.oj.friend.mapper.exam;


import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.oj.friend.entity.exam.ExamInfo;
import com.oj.friend.entity.exam.dto.ExamQueryDto;
import com.oj.friend.entity.exam.vo.ExamVo;

import java.util.List;

public interface ExamMapper extends BaseMapper<ExamInfo> {
    List<ExamVo> selectExamList(ExamQueryDto examQueryDto);
}

