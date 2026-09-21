package com.oj.system.service.exam;


import com.oj.system.entity.exam.dto.ExamQueryDto;
import com.oj.system.entity.exam.vo.ExamVO;

import java.util.List;

public interface IExamService {

    List<ExamVO> list(ExamQueryDto examQueryDto);
}
